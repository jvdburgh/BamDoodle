import { describe, expect, it, vi } from "vitest";
import { DrawingUtils } from "@/components/canvas/_utils/drawing.utils";
import { PencilUtils } from "@/components/sound/_utils/pencil.utils";

describe("PencilUtils.speed", () => {
  const points: [number, number, number][] = [
    [0, 0, 0.5],
    [0.3, 0, 0.5],
    [0.3, 0.4, 0.5],
  ];

  it("measures only the new points, from the one before them", () => {
    expect(PencilUtils.speed(points, 2, 1)).toBeCloseTo(0.4);
    expect(PencilUtils.speed(points, 1, 1)).toBeCloseTo(0.7);
  });

  it("divides by the time since the last batch", () => {
    expect(PencilUtils.speed(points, 2, 0.5)).toBeCloseTo(0.8);
  });

  it("is 0 without new points and never divides by less than a frame", () => {
    expect(PencilUtils.speed(points, 3, 1)).toBe(0);
    expect(PencilUtils.speed(points, 2, 0)).toBeCloseTo(0.4 * 60);
  });
});

describe("PencilUtils.follow", () => {
  const pen = { playerId: 1, color: "#f13866", size: 0.01, hasPressure: false };
  const setup = () => {
    const drawing = DrawingUtils.createDrawing();
    const pencil = { pencilMove: vi.fn(), pencilStop: vi.fn() };
    let time = 0;
    const tick = (ms: number) => {
      time += ms;
    };
    const stop = PencilUtils.follow(drawing, pencil, () => time);
    return { drawing, pencil, tick, stop };
  };

  it("plays for your own stroke from its second batch, and stops when it ends", () => {
    const { drawing, pencil, tick } = setup();
    drawing.begin(pen, [0, 0, 0.5]);
    expect(pencil.pencilMove).not.toHaveBeenCalled();
    tick(100);
    drawing.extend([[0.1, 0, 0.5]]);
    expect(pencil.pencilMove).toHaveBeenLastCalledWith(expect.closeTo(1));
    drawing.end();
    expect(pencil.pencilStop).toHaveBeenCalledTimes(1);
  });

  it("plays for someone else's stroke as the server's copy grows", () => {
    const { drawing, pencil, tick } = setup();
    const theirs = { ...pen, id: "s7", playerId: 2, points: [[0, 0, 0.5]] as [number, number, number][] };
    drawing.sync([], theirs);
    tick(50);
    drawing.sync([], { ...theirs, points: [...theirs.points, [0, 0.1, 0.5]] });
    expect(pencil.pencilMove).toHaveBeenCalledTimes(1);
    drawing.sync([{ ...theirs, points: [...theirs.points, [0, 0.1, 0.5]] }], null);
    expect(pencil.pencilStop).toHaveBeenCalledTimes(1);
  });

  it("stops and stops listening when unsubscribed", () => {
    const { drawing, pencil, stop } = setup();
    stop();
    expect(pencil.pencilStop).toHaveBeenCalledTimes(1);
    drawing.begin(pen, [0, 0, 0.5]);
    drawing.extend([[0.1, 0, 0.5]]);
    expect(pencil.pencilMove).not.toHaveBeenCalled();
  });
});
