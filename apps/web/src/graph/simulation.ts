import type { GraphLink, GraphNode } from '../data';

/**
 * A small force-directed simulation, integrated a frame at a time.
 *
 * Three forces and nothing else: nodes push each other apart, links pull their ends
 * together, and every node drifts toward its category's center. The category gravity is
 * what makes the six clusters in the screenshots hold their shape while the graph settles.
 *
 * d3-force would do the same job, but it would be a dependency reproducing behavior that
 * is thirty lines here, and the cluster force is the interesting part either way.
 */

export interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

export interface SimLink {
  source: SimNode;
  target: SimNode;
  type: GraphLink['type'];
}

/** Where each cluster sits, evenly spaced around a ring. */
const CLUSTER_ANGLES: Record<string, number> = {
  'core-functions': 0.1 * Math.PI,
  composition: 0.45 * Math.PI,
  'purity-state': 0.8 * Math.PI,
  'category-morphisms': 1.15 * Math.PI,
  'algebraic-structures': 1.5 * Math.PI,
  'types-data': 1.85 * Math.PI,
};

export const CLUSTER_RADIUS = 400;
/** The dashed constellation ring, and how far out the category label pill sits. */
export const HALO_RADIUS = 220;
export const GLOW_RADIUS = 260;

const K_REPEL = 950;
const K_SPRING = 0.0035;
const SPRING_LENGTH = 130;
const K_CENTER = 0.0005;
const K_CLUSTER = 0.0055;
const DAMPING = 0.88;
/** Beyond this, repulsion is too weak to matter and skipping it keeps the loop cheap. */
const REPEL_CUTOFF = 460;
/** Below this, movement is under a pixel a frame and the layout counts as settled. */
export const QUIET_ENERGY = 0.05;

export function clusterCenters(): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const [cat, angle] of Object.entries(CLUSTER_ANGLES)) {
    out[cat] = { x: Math.cos(angle) * CLUSTER_RADIUS, y: Math.sin(angle) * CLUSTER_RADIUS };
  }
  return out;
}

/**
 * Seeded placement. Nodes start spread around their own cluster rather than at random,
 * so the layout settles the same way on every visit instead of jittering into a new
 * arrangement each time the page loads.
 */
export function initNodes(nodes: GraphNode[]): SimNode[] {
  const centers = clusterCenters();
  return nodes.map((n, idx) => {
    const c = centers[n.category] ?? { x: 0, y: 0 };
    const angle = (idx / nodes.length) * Math.PI * 2;
    // A deterministic stand-in for the jitter that keeps coincident nodes from sticking.
    const wobble = Math.sin(idx * 12.9898) * 43758.5453;
    const spread = 50 + (wobble - Math.floor(wobble)) * 140;
    return {
      ...n,
      x: c.x + Math.cos(angle) * spread,
      y: c.y + Math.sin(angle) * spread,
      vx: 0,
      vy: 0,
      // Bigger radius for a concept more things point at.
      radius: Math.max(18, Math.min(36, 16 + (n.val || 3) * 2.2)),
      mass: Math.max(1, (n.val || 2) * 0.85),
    };
  });
}

export function linkNodes(links: GraphLink[], byId: Map<string, SimNode>): SimLink[] {
  const out: SimLink[] = [];
  for (const l of links) {
    const source = byId.get(l.source);
    const target = byId.get(l.target);
    if (source && target) out.push({ source, target, type: l.type });
  }
  return out;
}

/**
 * Integrates one frame and returns the total kinetic energy, so the caller can stop
 * stepping once the layout has settled. A graph that keeps drifting under the cursor is
 * distracting, and a idle tab should not burn a core on physics nobody is watching.
 */
export function step(nodes: SimNode[], links: SimLink[], pinned: SimNode | null = null): number {
  const centers = clusterCenters();

  // 1. Repulsion, so labels do not pile on top of each other.
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = Math.max(dx * dx + dy * dy, 1);
      if (distSq > REPEL_CUTOFF * REPEL_CUTOFF) continue;
      const dist = Math.sqrt(distSq);
      const force = (K_REPEL * (a.radius + b.radius)) / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (a !== pinned) {
        a.vx -= fx / a.mass;
        a.vy -= fy / a.mass;
      }
      if (b !== pinned) {
        b.vx += fx / b.mass;
        b.vy += fy / b.mass;
      }
    }
  }

  // 2. Springs, so related concepts sit near each other.
  for (const { source, target } of links) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const force = (dist - SPRING_LENGTH) * K_SPRING;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    if (source !== pinned) {
      source.vx += fx;
      source.vy += fy;
    }
    if (target !== pinned) {
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  // 3. Cluster gravity and a gentle pull toward the origin.
  let energy = 0;
  for (const n of nodes) {
    if (n === pinned) continue;
    const c = centers[n.category] ?? { x: 0, y: 0 };
    n.vx += (c.x - n.x) * K_CLUSTER;
    n.vy += (c.y - n.y) * K_CLUSTER;
    n.vx -= n.x * K_CENTER;
    n.vy -= n.y * K_CENTER;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    energy += n.vx * n.vx + n.vy * n.vy;
  }
  return energy;
}

/** The bounding box of the settled layout, label pills and halos included. */
export function bounds(nodes: SimNode[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    // Labels hang below each node and cluster pills sit above, so pad generously.
    minX = Math.min(minX, n.x - n.radius - 60);
    maxX = Math.max(maxX, n.x + n.radius + 60);
    minY = Math.min(minY, n.y - n.radius - 40);
    maxY = Math.max(maxY, n.y + n.radius + 34);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}

/**
 * Runs the simulation to rest before the first paint, so the graph opens composed instead
 * of visibly flying apart, and so the bounding box the camera fits to is the final one.
 *
 * Returns the number of ticks it took. The cap is a guard against a pathological layout,
 * not the expected exit.
 */
export function settle(nodes: SimNode[], links: SimLink[], maxTicks = 1200): number {
  for (let i = 0; i < maxTicks; i++) {
    if (step(nodes, links) < QUIET_ENERGY) return i + 1;
  }
  return maxTicks;
}
