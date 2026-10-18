import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

/** Called with the player whose strokes changed, or null when everyone's did. */
type DrawingListener = (playerId: number | null) => void;

/**
 * The shared picture: the stroke list plus one offscreen layer per player, rendered lazily from that list.
 * Lives outside React; components subscribe and composite from `layer()`.
 */
export type Drawing = {
  strokes: () => readonly Stroke[];
  strokesOf: (playerId: number) => Stroke[];
  live: () => Stroke | null;
  begin: (stroke: Omit<Stroke, "id" | "points">, point: StrokePoint) => void;
  extend: (points: StrokePoint[]) => void;
  end: () => Stroke | null;
  load: (strokes: Stroke[]) => void;
  /**
   * The server's picture: `strokes` are finished, `live` is being drawn. Strokes drawn on this device stay as drawn
   * here until the server's finished copy of each arrives, instead of its echo, which lags behind the pen. Strokes
   * the server never finished are let go once someone else draws.
   */
  sync: (strokes: readonly Stroke[], live: Stroke | null) => void;
  clear: () => void;
  /** A canvas showing this drawing asks for layers at least its size; layers follow the biggest claim. */
  claim: (owner: object, width: number, height: number) => void;
  release: (owner: object) => void;
  layer: (playerId: number) => OffscreenCanvas | null;
  subscribe: (listener: DrawingListener) => () => void;
};

function createDrawing(): Drawing {
  let strokes: Stroke[] = [];
  let live: Stroke | null = null;
  let drawingHere = false;
  /** The server's finished strokes, and the ones finished here that it hasn't finished yet, in order. */
  let confirmed: readonly Stroke[] = [];
  let pending: Stroke[] = [];
  let localPlayer: number | null = null;
  /** How many finished strokes by `localPlayer` the server will have once everything drawn here is in. */
  let expected = 0;
  let width = 0;
  let height = 0;
  let nextId = 1;
  const layers = new Map<number, OffscreenCanvas>();
  const dirty = new Set<number>();
  const paths = new Map<string, Path2D>();
  const listeners = new Set<DrawingListener>();
  const claims = new Map<object, { width: number; height: number }>();

  const strokesOf = (playerId: number) => {
    const own = strokes.filter((stroke) => stroke.playerId === playerId);
    return live?.playerId === playerId ? [...own, live] : own;
  };

  const changed = (playerId: number | null) => {
    if (playerId === null) {
      for (const id of layers.keys()) dirty.add(id);
    } else {
      dirty.add(playerId);
    }
    for (const listener of listeners) listener(playerId);
  };

  const fitClaims = () => {
    let biggest = { width: 0, height: 0 };
    for (const size of claims.values()) if (size.width > biggest.width) biggest = size;
    if (biggest.width === width && biggest.height === height) return;
    width = biggest.width;
    height = biggest.height;
    paths.clear();
    for (const layer of layers.values()) {
      layer.width = Math.max(1, width);
      layer.height = Math.max(1, height);
    }
    changed(null);
  };

  const pathFor = (stroke: Stroke) => {
    if (stroke === live) return new Path2D(CanvasUtils.strokeToPath(stroke, width, height, false));
    let path = paths.get(stroke.id);
    if (!path) {
      path = new Path2D(CanvasUtils.strokeToPath(stroke, width, height));
      paths.set(stroke.id, path);
    }
    return path;
  };

  const render = (playerId: number, layer: OffscreenCanvas) => {
    const context = layer.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    for (const stroke of strokesOf(playerId)) {
      context.fillStyle = stroke.color;
      context.fill(pathFor(stroke));
    }
  };

  return {
    strokes: () => strokes,
    strokesOf,
    live: () => live,
    begin(stroke, point) {
      live = { ...stroke, id: `${stroke.playerId}-${nextId++}`, points: [point] };
      drawingHere = true;
      const finished = confirmed.filter((other) => other.playerId === stroke.playerId).length;
      if (localPlayer !== stroke.playerId) pending = [];
      localPlayer = stroke.playerId;
      expected = finished + pending.length + 1;
      changed(stroke.playerId);
    },
    extend(points) {
      if (!live || points.length === 0) return;
      live.points.push(...points);
      changed(live.playerId);
    },
    end() {
      if (!live) return null;
      const done = { ...live, points: CanvasUtils.simplify(live.points, CanvasUtils.SIMPLIFY_TOLERANCE) };
      strokes = [...strokes, done];
      pending = [...pending, done];
      live = null;
      drawingHere = false;
      changed(done.playerId);
      return done;
    },
    load(next) {
      strokes = [...next];
      confirmed = [];
      pending = [];
      live = null;
      drawingHere = false;
      paths.clear();
      changed(null);
    },
    sync(next, remoteLive) {
      confirmed = next;
      if (remoteLive && remoteLive.playerId !== localPlayer) {
        pending = [];
      } else if (localPlayer !== null) {
        const finished = next.filter((stroke) => stroke.playerId === localPlayer).length;
        const outstanding = Math.max(0, expected - finished - (drawingHere ? 1 : 0));
        pending = pending.slice(Math.max(0, pending.length - outstanding));
      }
      const shown = [...next, ...pending];

      const touched = new Set<number>();
      const kept = new Set(shown);
      const before = new Set(strokes);
      for (const stroke of shown) if (!before.has(stroke)) touched.add(stroke.playerId);
      for (const stroke of strokes) {
        if (kept.has(stroke)) continue;
        touched.add(stroke.playerId);
        paths.delete(stroke.id);
      }
      strokes = shown;
      const echoOfOurs = remoteLive?.playerId === localPlayer && pending.length > 0;
      const nextLive = echoOfOurs ? null : remoteLive;
      if (!drawingHere && live !== nextLive) {
        if (live) touched.add(live.playerId);
        if (nextLive) touched.add(nextLive.playerId);
        live = nextLive;
      }
      for (const playerId of touched) changed(playerId);
    },
    clear() {
      strokes = [];
      confirmed = [];
      pending = [];
      live = null;
      drawingHere = false;
      paths.clear();
      changed(null);
    },
    claim(owner, claimWidth, claimHeight) {
      claims.set(owner, { width: claimWidth, height: claimHeight });
      fitClaims();
    },
    release(owner) {
      claims.delete(owner);
      fitClaims();
    },
    layer(playerId) {
      if (width === 0 || height === 0) return null;
      let layer = layers.get(playerId);
      if (!layer) {
        layer = new OffscreenCanvas(width, height);
        layers.set(playerId, layer);
        dirty.add(playerId);
      }
      if (dirty.delete(playerId)) render(playerId, layer);
      return layer;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const DrawingUtils = { createDrawing };
