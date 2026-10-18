/** Points for hand-drawn marks (rings, underlines, faces), wobbly but repeatable for the same seed. */

type Points = number[][];

/** mulberry32: tiny seeded PRNG so a scribble looks the same on every render. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Loop = { cx: number; cy: number; rx: number; ry: number; turns?: number; wobble?: number; start?: number };

/** An ellipse drawn in one go: starts a little off, overshoots, and wobbles like a hand would. */
function loop(seed: number, { cx, cy, rx, ry, turns = 1.12, wobble = 0.06, start }: Loop): Points {
  const rand = random(seed);
  const from = start ?? rand() * Math.PI * 2;
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  const steps = Math.round(48 * turns);
  const points: Points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = from + t * turns * Math.PI * 2;
    const drift = 1 + wobble * Math.sin(angle * 2 + phaseA) + wobble * 0.5 * Math.sin(angle * 3 + phaseB) + t * wobble;
    points.push([cx + Math.cos(angle) * rx * drift, cy + Math.sin(angle) * ry * drift, 0.5]);
  }
  return points;
}

/** A gentle curve from `(x1, y1)` to `(x2, y2)`, bowed by `bow` and wobbled a little. */
function line(seed: number, x1: number, y1: number, x2: number, y2: number, bow = 0): Points {
  const rand = random(seed);
  const jitter = (rand() - 0.5) * 0.04 * Math.hypot(x2 - x1, y2 - y1);
  const steps = 16;
  const normal = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
  const points: Points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lift = Math.sin(t * Math.PI) * (bow + jitter);
    points.push([x1 + (x2 - x1) * t + Math.cos(normal) * lift, y1 + (y2 - y1) * t + Math.sin(normal) * lift, 0.5]);
  }
  return points;
}

export const ScribbleUtils = { random, loop, line };
