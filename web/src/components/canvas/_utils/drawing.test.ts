import { describe, expect, it, vi } from "vitest";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";

const pen = { playerId: "pip", color: "#f13866", size: 0.01, hasPressure: false };

describe("DrawingUtils.createDrawing", () => {
  it("keeps the stroke in progress out of the finished strokes until it ends", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.extend([[0.2, 0.2, 0.5]]);

    expect(drawing.strokes()).toHaveLength(0);
    expect(drawing.strokesOf("pip")).toHaveLength(1);

    const stroke = drawing.end();
    expect(stroke?.points).toHaveLength(2);
    expect(drawing.strokes()).toEqual([stroke]);
    expect(drawing.live()).toBeNull();
  });

  it("attributes strokes to the player who drew them", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.begin(pen, [0.1, 0.1, 0.5]);
    drawing.end();
    drawing.begin({ ...pen, playerId: "juno" }, [0.5, 0.5, 0.5]);
    drawing.end();

    expect(drawing.strokesOf("pip")).toHaveLength(1);
    expect(drawing.strokesOf("juno")).toHaveLength(1);
    expect(drawing.strokesOf("mo")).toHaveLength(0);
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

    expect(listener.mock.calls).toEqual([["pip"], [null]]);
  });

  it("ignores extend and end without a stroke in progress", () => {
    const drawing = DrawingUtils.createDrawing();
    drawing.extend([[0.1, 0.1, 0.5]]);
    expect(drawing.end()).toBeNull();
  });

  it("has no layers until it knows its size", () => {
    expect(DrawingUtils.createDrawing().layer("pip")).toBeNull();
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
    expect(drawing.layer("pip")).toBeNull();
  });
});
