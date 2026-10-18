import { describe, expect, it, vi } from "vitest";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";

const pen = { playerId: 1, color: "#f13866", size: 0.01, hasPressure: false };

describe("DrawingUtils.createDrawing", () => {
  it("keeps the stroke in progress out of the finished strokes until it ends", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.extend([[0.2, 0.2, 0.5]]);

    expect(drawing.strokes()).toHaveLength(0);
    expect(drawing.strokesOf(1)).toHaveLength(1);

    const stroke = drawing.end();
    expect(stroke?.points).toHaveLength(2);
    expect(drawing.strokes()).toEqual([stroke]);
    expect(drawing.live()).toBeNull();
  });

  it("attributes strokes to the player who drew them", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.end();
    drawing.begin({ ...pen, playerId: 2 }, [0.5, 0.5, 0.5]);
    drawing.end();

    expect(drawing.strokesOf(1)).toHaveLength(1);
    expect(drawing.strokesOf(2)).toHaveLength(1);
    expect(drawing.strokesOf(3)).toHaveLength(0);
  });

  it("gives every stroke its own id", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    const first = drawing.end();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    const second = drawing.end();
    expect(first?.id).not.toBe(second?.id);
  });

  it("tells subscribers whose strokes changed", () => {
    const drawing = DrawingUtils.createDrawing();
    const listener = vi.fn();
    const unsubscribe = drawing.subscribe(listener);

    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.clear();
    unsubscribe();
    drawing.end();

    expect(listener.mock.calls).toEqual([[1], [null]]);
  });

  it("ignores extend and end without a stroke in progress", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.extend([[0.1, 0.1, 0.5]]);
    expect(drawing.end()).toBeNull();
  });

  it("syncs to the server's strokes, the one in progress included", () => {
    const drawing = DrawingUtils.createDrawing();
    const done = { ...pen, id: "s1", points: [[0.1, 0.1, 0.5]] as [number, number, number][] };
    const live = { ...pen, id: "s2", playerId: 2, points: [[0.5, 0.5, 0.5]] as [number, number, number][] };
    drawing.sync([done], live);

    expect(drawing.strokes()).toEqual([done]);
    expect(drawing.live()).toBe(live);
    expect(drawing.strokesOf(2)).toEqual([live]);
  });

  it("keeps the stroke drawn on this device instead of the server's echo of it", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.extend([[0.2, 0.2, 0.5]]);
    const echo = { ...pen, id: "s1", points: [[0.1, 0.1, 0.5]] as [number, number, number][] };
    drawing.sync([], echo);

    expect(drawing.live()?.points).toHaveLength(2);
    drawing.end();
    drawing.sync([{ ...echo, points: [...echo.points, [0.2, 0.2, 0.5]] }], null);
    expect(drawing.strokes()).toHaveLength(1);
    expect(drawing.strokes()[0]?.id).toBe("s1");
  });

  it("keeps a stroke finished here until the server's finished copy arrives", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.extend([
      [0.2, 0.2, 0.5],
      [0.3, 0.3, 0.5],
      [0.4, 0.4, 0.5],
    ]);
    drawing.end();
    // An echo of an earlier batch, still unfinished, arrives after the pen went up.
    const echo = {
      ...pen,
      id: "s1",
      points: [
        [0.1, 0.1, 0.5],
        [0.2, 0.2, 0.5],
      ] as [number, number, number][],
    };
    drawing.sync([], echo);

    expect(drawing.strokesOf(1).map((stroke) => stroke.points.length)).toEqual([4]);
    drawing.sync([{ ...echo, points: [...echo.points, [0.4, 0.4, 0.5]] }], null);
    expect(drawing.strokesOf(1).map((stroke) => stroke.id)).toEqual(["s1"]);
  });

  it("keeps an earlier stroke while the next one is drawn before the server finished the first", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.end();
    drawing.begin(pen, [0.6, 0.6, 0.5]);
    drawing.sync([], { ...pen, id: "s1", points: [[0.1, 0.1, 0.5]] });

    expect(drawing.strokesOf(1)).toHaveLength(2);
  });

  it("lets go of strokes the server never finished once someone else draws", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.end();
    drawing.sync([], { ...pen, id: "s2", playerId: 2, points: [[0.5, 0.5, 0.5]] });

    expect(drawing.strokesOf(1)).toHaveLength(0);
  });

  it("tells subscribers only about players whose strokes changed in a sync", () => {
    const drawing = DrawingUtils.createDrawing();
    const pips = { ...pen, id: "s1", points: [[0.1, 0.1, 0.5]] as [number, number, number][] };
    drawing.sync([pips], null);
    const listener = vi.fn();
    drawing.subscribe(listener);

    drawing.sync([pips, { ...pips, id: "s2", playerId: 2 }], null);
    expect(listener.mock.calls).toEqual([[2]]);
  });

  it("has no layers until it knows its size", () => {
    expect(DrawingUtils.createDrawing().layer(1)).toBeNull();
  });

  it("sizes its layers to the biggest canvas that claims them", () => {
    const drawing = DrawingUtils.createDrawing();
    const listener = vi.fn();
    drawing.subscribe(listener);
    const phone = {};
    const tv = {};

    drawing.claim(phone, 400, 300);
    drawing.claim(tv, 1600, 1200);
    drawing.claim(phone, 420, 315);
    expect(listener).toHaveBeenCalledTimes(2);

    drawing.release(tv);
    expect(listener).toHaveBeenCalledTimes(3);
    drawing.release(phone);
    expect(drawing.layer(1)).toBeNull();
  });
});
