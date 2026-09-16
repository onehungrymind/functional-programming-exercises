/**
 * A short ring pulse when a whole concept is cleared. Nothing fires for a single rung,
 * and nothing fires at all under prefers-reduced-motion.
 *
 * Hand-drawn rather than pulled from canvas-confetti, which is a dependency for two
 * seconds of animation.
 */
export function celebrate(color = '#34d399'): void {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'celebrate';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const start = performance.now();
  const DURATION = 900;

  const frame = (now: number) => {
    const t = Math.min((now - start) / DURATION, 1);
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // Three rings, staggered, each fading as it grows.
    for (let i = 0; i < 3; i++) {
      const phase = Math.max(0, t - i * 0.12);
      if (phase <= 0) continue;
      const eased = 1 - Math.pow(1 - phase, 3);
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + eased * 260, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = (1 - phase) * 0.5;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
