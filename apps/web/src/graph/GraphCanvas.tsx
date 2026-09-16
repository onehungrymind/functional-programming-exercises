import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categoriesById, categoryColor, graph, type GraphNode } from '../data';
import {
  GLOW_RADIUS,
  HALO_RADIUS,
  QUIET_ENERGY,
  bounds,
  clusterCenters,
  initNodes,
  linkNodes,
  settle,
  step,
  type SimLink,
  type SimNode,
} from './simulation';

/** The math symbol drawn inside every node, by category. Straight from the upstream site. */
export const CATEGORY_GLYPH: Record<string, string> = {
  'core-functions': 'λ',
  composition: '∘',
  'purity-state': '≡',
  'category-morphisms': '→',
  'algebraic-structures': '★',
  'types-data': '∑',
};

export type NodeProgress = 'none' | 'partial' | 'complete';

export interface GraphCanvasProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchQuery: string;
  /** Term id -> how far through its rungs the learner is. Drives the progress arc. */
  progressByTerm: Map<string, { done: number; total: number }>;
  /** When on, only terms with exercises stay lit. */
  practiceFilter: boolean;
  theme: 'dark' | 'light';
}

interface Camera {
  x: number;
  y: number;
  scale: number;
  tx: number;
  ty: number;
  tScale: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

/** Reads a token off the document so the canvas and the CSS never drift apart. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function GraphCanvas({
  selectedId,
  onSelect,
  searchQuery,
  progressByTerm,
  practiceFilter,
  theme,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  // Focus starts on the first node so Tab has somewhere to land, but the camera must not
  // chase it until the learner actually moves focus, or the opening view is one node.
  const focusMoved = useRef(false);

  // The simulation is laid out once and then mutated in place at 60fps, so it lives in a
  // ref. Putting it in state would rerender React on every tick for no reason.
  const sim = useRef<{
    nodes: SimNode[];
    links: SimLink[];
    byId: Map<string, SimNode>;
    camera: Camera;
    dragging: SimNode | null;
    panning: { x: number; y: number; camX: number; camY: number } | null;
    moved: boolean;
    pulse: number;
    raf: number;
    /** Frames the layout has been still for. Past a few, stop integrating. */
    quietFrames: number;
    /** The zoom that fits the whole graph, computed once the canvas has a size. */
    fitScale: number;
    fitted: boolean;
  } | null>(null);

  if (!sim.current) {
    const nodes = initNodes(graph.nodes);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links = linkNodes(graph.links, byId);
    // Settle before the first paint so the graph opens composed, not exploding.
    settle(nodes, links);
    sim.current = {
      nodes,
      links,
      byId,
      camera: { x: 0, y: 0, scale: 0.95, tx: 0, ty: 0, tScale: 0.95 },
      dragging: null,
      panning: null,
      moved: false,
      pulse: 0,
      raf: 0,
      quietFrames: 0,
      fitScale: 0.95,
      fitted: false,
    };
  }

  const reducedMotion = useMemo(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Centering on the selected node is what makes a deep link land somewhere sensible.
  useEffect(() => {
    const s = sim.current!;
    if (!selectedId) return;
    const n = s.byId.get(selectedId);
    if (!n) return;
    s.camera.tx = -n.x;
    s.camera.ty = -n.y;
  }, [selectedId]);

  const resetView = useCallback(() => {
    const s = sim.current!;
    const b = bounds(s.nodes);
    s.camera.tx = -b.x;
    s.camera.ty = -b.y;
    s.camera.tScale = s.fitScale;
  }, []);

  /** Canvas space -> world space, so a click can be matched against node positions. */
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const { camera } = sim.current!;
    return {
      x: (clientX - rect.left - rect.width / 2) / camera.scale - camera.x,
      y: (clientY - rect.top - rect.height / 2) / camera.scale - camera.y,
    };
  }, []);

  const nodeAt = useCallback((clientX: number, clientY: number): SimNode | null => {
    const { x, y } = toWorld(clientX, clientY);
    const { nodes } = sim.current!;
    // Back to front, so the node drawn on top is the one that gets the click.
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]!;
      if (Math.hypot(n.x - x, n.y - y) <= n.radius + 4) return n;
    }
    return null;
  }, [toWorld]);

  // ---------------------------------------------------------------- render loop

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d')!;
    const s = sim.current!;
    let running = true;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // The whole graph should be on screen at rest. A fixed zoom either crops it on a
      // laptop or strands it in the middle of a large display.
      const b = bounds(s.nodes);
      s.fitScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(width / b.w, height / b.h) * 0.94));
      if (!s.fitted) {
        s.fitted = true;
        s.camera.scale = s.camera.tScale = s.fitScale;
        s.camera.x = s.camera.tx = -b.x;
        s.camera.y = s.camera.ty = -b.y;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      if (!running) return;
      s.raf = requestAnimationFrame(draw);
      s.pulse += reducedMotion ? 0 : 0.025;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const { nodes, links, camera } = s;

      // Ease the camera rather than snapping, so selecting a node reads as travel.
      camera.x += (camera.tx - camera.x) * 0.08;
      camera.y += (camera.ty - camera.y) * 0.08;
      camera.scale += (camera.tScale - camera.scale) * 0.08;

      // Stop integrating once the layout is still, and wake it up again on a drag.
      if (s.dragging) s.quietFrames = 0;
      if (s.quietFrames < 30) {
        const energy = step(nodes, links, s.dragging);
        s.quietFrames = energy < QUIET_ENERGY ? s.quietFrames + 1 : 0;
      }

      const colors = {
        text: token('--text'),
        panel: token('--panel'),
        muted: token('--muted'),
        ok: token('--ok'),
        accent: token('--accent'),
        bg: token('--bg'),
      };
      const isDark = theme === 'dark';

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(width / 2, height / 2);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate(camera.x, camera.y);

      // What is lit and what is dimmed.
      const activeId = hoveredId ?? selectedId;
      const connected = new Set<string>();
      if (activeId) {
        connected.add(activeId);
        for (const l of links) {
          if (l.source.id === activeId) connected.add(l.target.id);
          if (l.target.id === activeId) connected.add(l.source.id);
        }
      }

      const q = searchQuery.trim().toLowerCase();
      const matched: Set<string> | null = q
        ? new Set(
            nodes
              .filter((n) => n.name.toLowerCase().includes(q) || n.id.includes(q))
              .map((n) => n.id),
          )
        : null;

      const inPractice = (id: string) => progressByTerm.has(id);

      // ------------------------------------------------ cluster glows and rings
      const centers = clusterCenters();
      for (const [catId, center] of Object.entries(centers)) {
        const cat = categoriesById.get(catId);
        if (!cat) continue;

        const grad = ctx.createRadialGradient(center.x, center.y, 20, center.x, center.y, GLOW_RADIUS);
        grad.addColorStop(0, `${cat.color}${isDark ? '20' : '15'}`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(center.x, center.y, GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = `${cat.color}${isDark ? '30' : '40'}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, HALO_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Category label pill, sitting just outside the ring.
        ctx.save();
        ctx.font = '600 11px var(--mono), monospace';
        ctx.textAlign = 'center';
        const label = cat.name.toUpperCase();
        const w = ctx.measureText(label).width + 16;
        const y = center.y - (HALO_RADIUS + 10);
        ctx.fillStyle = colors.panel;
        ctx.strokeStyle = token('--line2');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(center.x - w / 2, y - 11, w, 22, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = colors.text;
        ctx.fillText(label, center.x, y + 4);
        ctx.restore();
      }

      // ------------------------------------------------ links
      for (const l of links) {
        const lit = !!activeId && (l.source.id === activeId || l.target.id === activeId);
        const dimmed =
          (!!activeId && !lit) ||
          (matched !== null && (!matched.has(l.source.id) || !matched.has(l.target.id))) ||
          (practiceFilter && !(inPractice(l.source.id) && inPractice(l.target.id)));

        const { x: sx, y: sy } = l.source;
        const { x: tx, y: ty } = l.target;
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.hypot(dx, dy) || 1;
        // A slight bow, so two links between neighbours do not overlap into one line.
        const mx = (sx + tx) / 2 + (-dy / dist) * 16;
        const my = (sy + ty) / 2 + (dx / dist) * 16;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, tx, ty);

        if (lit) {
          const color = categoryColor(l.source.category);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.8;
          ctx.setLineDash(l.type === 'reference' ? [5, 5] : []);
          ctx.stroke();
          ctx.setLineDash([]);

          // A lit particle travelling the edge, which is what reads as direction.
          if (!reducedMotion) {
            const p = (s.pulse * 1.6) % 1;
            const px = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * mx + p * p * tx;
            const py = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * my + p * p * ty;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? '#ffffff' : colors.bg;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Arrowhead, stopped short of the target so it does not sit under the circle.
          const angle = Math.atan2(ty - my, tx - mx);
          const ax = tx - Math.cos(angle) * (l.target.radius + 6);
          const ay = ty - Math.sin(angle) * (l.target.radius + 6);
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-7, -4);
          ctx.lineTo(-7, 4);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.strokeStyle = isDark
            ? `rgba(255, 255, 255, ${dimmed ? 0.04 : 0.22})`
            : `rgba(15, 23, 42, ${dimmed ? 0.04 : 0.28})`;
          ctx.lineWidth = l.type === 'reference' ? 1 : 1.4;
          ctx.setLineDash(l.type === 'reference' ? [3, 4] : []);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ------------------------------------------------ nodes
      nodes.forEach((n, i) => {
        const selected = n.id === selectedId;
        const hovered = n.id === hoveredId;
        const focused = i === focusIndex;
        const dimmed =
          (!!activeId && !connected.has(n.id)) ||
          (matched !== null && !matched.has(n.id)) ||
          (practiceFilter && !inPractice(n.id));

        const color = categoryColor(n.category);
        const glyph = CATEGORY_GLYPH[n.category] ?? 'λ';

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.16 : 1;

        if (selected) {
          const halo = reducedMotion ? 8 : 6 + Math.sin(s.pulse * 3) * 4;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + halo + 4, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${isDark ? '35' : '20'}`;
          ctx.fill();

          if (!reducedMotion) {
            const phase = (s.pulse * 0.75) % 1;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius + 6 + phase * 24, 0, Math.PI * 2);
            ctx.strokeStyle = isDark
              ? `rgba(240, 240, 238, ${(1 - phase) * 0.65})`
              : `rgba(26, 26, 25, ${(1 - phase) * 0.65})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.4;
          ctx.stroke();
        } else if (hovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
          ctx.fill();
        }

        if (focused && !selected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 7, 0, Math.PI * 2);
          ctx.strokeStyle = colors.accent;
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (matched?.has(n.id) && !selected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Body
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#111827' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = selected || hovered ? 3.5 : 2.2;
        ctx.stroke();

        // Progress arc, only for terms that actually have exercises.
        const prog = progressByTerm.get(n.id);
        if (prog && prog.total > 0 && prog.done > 0) {
          const complete = prog.done >= prog.total;
          ctx.beginPath();
          ctx.arc(
            n.x,
            n.y,
            n.radius + 7,
            -Math.PI / 2,
            -Math.PI / 2 + (prog.done / prog.total) * Math.PI * 2,
          );
          ctx.strokeStyle = complete ? colors.ok : color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.lineCap = 'butt';
        }

        // Glyph
        ctx.fillStyle = color;
        ctx.font = `700 ${Math.max(11, n.radius * 0.55)}px var(--mono), monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, n.x, n.y);

        // Label, on a backing pill so it stays readable over a glow.
        ctx.font = `${selected || hovered ? '600' : '500'} ${Math.max(10.5, Math.min(12.5, 9.5 + n.radius * 0.1))}px var(--mono), monospace`;
        ctx.textBaseline = 'top';
        const labelY = n.y + n.radius + 6;
        const tw = ctx.measureText(n.name).width;
        ctx.fillStyle = selected ? colors.text : colors.panel;
        ctx.strokeStyle = token('--line2');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(n.x - tw / 2 - 6, labelY - 2, tw + 12, 20, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = selected ? colors.bg : colors.muted;
        ctx.fillText(n.name, n.x, labelY + 2);

        ctx.restore();
      });

      ctx.restore();
    };

    s.raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(s.raf);
      ro.disconnect();
    };
  }, [selectedId, hoveredId, searchQuery, progressByTerm, practiceFilter, theme, focusIndex, reducedMotion]);

  // ---------------------------------------------------------------- pointer

  const onPointerDown = (e: React.PointerEvent) => {
    const s = sim.current!;
    s.moved = false;
    const hit = nodeAt(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (hit) {
      s.dragging = hit;
      s.quietFrames = 0;
    } else {
      s.panning = { x: e.clientX, y: e.clientY, camX: s.camera.tx, camY: s.camera.ty };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = sim.current!;
    if (s.dragging) {
      s.moved = true;
      const { x, y } = toWorld(e.clientX, e.clientY);
      s.dragging.x = x;
      s.dragging.y = y;
      s.dragging.vx = 0;
      s.dragging.vy = 0;
      return;
    }
    if (s.panning) {
      s.moved = true;
      s.camera.tx = s.panning.camX + (e.clientX - s.panning.x) / s.camera.scale;
      s.camera.ty = s.panning.camY + (e.clientY - s.panning.y) / s.camera.scale;
      s.camera.x = s.camera.tx;
      s.camera.y = s.camera.ty;
      return;
    }
    const hit = nodeAt(e.clientX, e.clientY);
    setHoveredId(hit?.id ?? null);
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'grab';
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = sim.current!;
    const wasDragging = s.dragging;
    const moved = s.moved;
    s.dragging = null;
    s.panning = null;
    // A drag that moved the node is not a click. Only a still press selects.
    if (!moved) {
      const hit = nodeAt(e.clientX, e.clientY);
      onSelect(hit?.id ?? null);
      if (hit) {
        // A click already centers via the selection effect, so do not double-move.
        setFocusIndex(s.nodes.indexOf(hit));
      }
    }
    if (wasDragging) {
      wasDragging.vx = 0;
      wasDragging.vy = 0;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const c = sim.current!.camera;
    const next = c.tScale * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
    c.tScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
  };

  // ---------------------------------------------------------------- keyboard

  const onKeyDown = (e: React.KeyboardEvent) => {
    const s = sim.current!;
    const n = s.nodes.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusMoved.current = true;
      setFocusIndex((i) => (i + 1) % n);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusMoved.current = true;
      setFocusIndex((i) => (i - 1 + n) % n);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const node = s.nodes[focusIndex];
      if (node) onSelect(node.id);
    } else if (e.key === '+' || e.key === '=') {
      s.camera.tScale = Math.min(MAX_SCALE, s.camera.tScale * 1.15);
    } else if (e.key === '-') {
      s.camera.tScale = Math.max(MIN_SCALE, s.camera.tScale / 1.15);
    } else if (e.key === '0') {
      resetView();
    }
  };

  // Keyboard focus moves the camera too, or arrowing lands on nodes off screen.
  useEffect(() => {
    if (!focusMoved.current) return;
    const s = sim.current!;
    const node = s.nodes[focusIndex];
    if (!node) return;
    s.camera.tx = -node.x;
    s.camera.ty = -node.y;
  }, [focusIndex]);

  const focused: GraphNode | undefined = sim.current!.nodes[focusIndex];

  return (
    <div className="graph-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        tabIndex={0}
        role="application"
        aria-label={`Concept graph, ${graph.nodes.length} terms. Arrow keys move between concepts, Enter opens one.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHoveredId(null)}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      />
      {/* Announces the focused node, since a canvas tells a screen reader nothing. */}
      <div className="sr-only" aria-live="polite">
        {focused ? `${focused.name}, ${categoriesById.get(focused.category)?.name}` : ''}
      </div>
      <div className="graph-foot">
        <button type="button" className="ghost-btn" onClick={resetView}>
          [ Reset ]
        </button>
        <span className="hint">drag: pan &middot; scroll: zoom</span>
      </div>
    </div>
  );
}
