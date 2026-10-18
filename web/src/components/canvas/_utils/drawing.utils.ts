import type { Stroke, StrokePoint } from "@/components/canvas/_types/stroke.types";
import { CanvasUtils } from "@/components/canvas/_utils/canvas.utils";

const SIMPLIFY_TOLERANCE = 0.0015;

/** Called with the player whose strokes changed, or null when everyone's did. */
type DrawingListener = (playerId: string | null) => void;

/**
 * The shared picture: the stroke list plus one offscreen layer per player, rendered lazily from that list.
 * Lives outside React; components subscribe and composite from `layer()`.
 */
export type Drawing = {
  strokes: () => readonly Stroke[];
  strokesOf: (playerId: string) => Stroke[];
  live: () => Stroke | null;
  begin: (stroke: Omit<Stroke, "id" | "points">, point: StrokePoint) => void;
  extend: (points: StrokePoint[]) => void;
  end: () => Stroke | null;
  load: (strokes: Stroke[]) => void;
  clear: () => void;
  resize: (width: number, height: number) => void;
  layer: (playerId: string) => OffscreenCanvas | null;
  subscribe: (listener: DrawingListener) => () => void;
};

function createDrawing(): Drawing {
  let strokes: Stroke[] = [];
  let live: Stroke | null = null;
  let width = 0;
  let height = 0;
  let nextId = 1;
  const layers = new Map<string, OffscreenCanvas>();
  const dirty = new Set<string>();
  const paths = new Map<string, Path2D>();
  const listeners = new Set<DrawingListener>();

  const strokesOf = (playerId: string) => {
    const own = strokes.filter((stroke) => stroke.playerId === playerId);
    return live?.playerId === playerId ? [...own, live] : own;
  };

  const changed = (playerId: string | null) => {
    if (playerId === null) {
      for (const id of layers.keys()) dirty.add(id);
    } else {
      dirty.add(playerId);
    }
    for (const listener of listeners) listener(playerId);
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

  const render = (playerId: string, layer: OffscreenCanvas) => {
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
      changed(stroke.playerId);
    },
    extend(points) {
      if (!live || points.length === 0) return;
      live.points.push(...points);
      changed(live.playerId);
    },
    end() {
      if (!live) return null;
      const done = { ...live, points: CanvasUtils.simplify(live.points, SIMPLIFY_TOLERANCE) };
      strokes = [...strokes, done];
      live = null;
      changed(done.playerId);
      return done;
    },
    load(next) {
      strokes = [...next];
      live = null;
      paths.clear();
      changed(null);
    },
    clear() {
      strokes = [];
      live = null;
      paths.clear();
      changed(null);
    },
    resize(nextWidth, nextHeight) {
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      paths.clear();
      for (const layer of layers.values()) {
        layer.width = width;
        layer.height = height;
      }
      changed(null);
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
