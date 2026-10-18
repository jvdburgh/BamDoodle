import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { CanvasBoard } from "./CanvasBoard.component";
import { drawingFixture } from "./_fixtures/drawing.fixture";

const order = [1, 2, 3, 4];

const meta = {
  title: "Canvas/CanvasBoard",
  component: CanvasBoard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[min(90vw,40rem)]">
        <Story />
      </div>
    ),
  ],
  argTypes: { drawing: { control: false } },
  args: {
    drawing: drawingFixture(),
    order,
    activePlayerId: 1,
    color: "#f13866",
    brushSize: 0.014,
    label: "Shared drawing",
    onStrokeBegin: fn(),
    onStrokeExtend: fn(),
    onStrokeEnd: fn(),
    penTag: <span className="rounded-full bg-night px-2 font-display text-white">Pip</span>,
  },
} satisfies Meta<typeof CanvasBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

function pointerAt(canvas: HTMLCanvasElement) {
  const box = canvas.getBoundingClientRect();
  const at = (x: number, y: number): PointerEventInit => ({
    clientX: box.left + x * box.width,
    clientY: box.top + y * box.height,
    pointerId: 3,
    pointerType: "mouse",
    pressure: 0.5,
    button: 0,
    buttons: 1,
    bubbles: true,
  });
  return at;
}

function pressAndMove(canvas: HTMLCanvasElement) {
  const at = pointerAt(canvas);
  canvas.dispatchEvent(new PointerEvent("pointerdown", at(0.1, 0.1)));
  for (let i = 1; i <= 10; i++)
    canvas.dispatchEvent(new PointerEvent("pointermove", at(0.1 + i * 0.05, 0.1 + i * 0.03)));
}

function release(canvas: HTMLCanvasElement) {
  canvas.dispatchEvent(new PointerEvent("pointerup", pointerAt(canvas)(0.6, 0.4)));
}

function drawLine(canvas: HTMLCanvasElement) {
  pressAndMove(canvas);
  release(canvas);
}

export const Drawing: Story = {
  args: { drawing: drawingFixture([]) },
  play: async ({ args, canvas }) => {
    drawLine(canvas.getByRole("img", { name: "Shared drawing" }) as HTMLCanvasElement);
    await expect(args.onStrokeEnd).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 1, color: "#f13866", size: 0.014, hasPressure: false }),
    );
    const [stroke] = (args.onStrokeEnd as ReturnType<typeof fn>).mock.calls[0] ?? [];
    await expect(stroke.points[0]).toEqual([0.1, 0.1, 0.5]);
    await expect(stroke.points.at(-1)).toEqual([0.6, 0.4, 0.5]);
    // The points also come out as they're drawn, so they can go over the wire live.
    await expect(args.onStrokeBegin).toHaveBeenCalledWith(expect.objectContaining({ points: [[0.1, 0.1, 0.5]] }));
    await expect(args.onStrokeExtend).toHaveBeenCalledTimes(10);
  },
};

export const Locked: Story = {
  args: { drawing: drawingFixture([]), activePlayerId: null, label: "Shared drawing. The round is over." },
  play: async ({ args, canvas }) => {
    drawLine(canvas.getByRole("img", { name: /round is over/ }) as HTMLCanvasElement);
    await expect(args.onStrokeBegin).not.toHaveBeenCalled();
    await expect(args.onStrokeEnd).not.toHaveBeenCalled();
  },
};

export const Spotlight: Story = {
  args: { activePlayerId: null, spotlightId: 3, label: "Shared drawing. Mo’s lines stand out." },
  play: async ({ canvas }) => {
    const board = canvas.getByRole("img", { name: /Mo’s lines/ }) as HTMLCanvasElement;
    await waitFor(() => expect(board.width).toBeGreaterThan(0));
  },
};

const turnEndsDrawing = drawingFixture([]);

export const TurnEndsMidStroke: Story = {
  args: { drawing: turnEndsDrawing },
  render: function Render(args) {
    const [activePlayerId, setActivePlayerId] = useState<number | null>(1);
    return (
      <>
        <CanvasBoard {...args} activePlayerId={activePlayerId} />
        <button type="button" onClick={() => setActivePlayerId(2)} className="mt-2 text-white">
          Time’s up for Pip
        </button>
      </>
    );
  },
  play: async ({ args, canvas, userEvent }) => {
    const board = canvas.getByRole("img", { name: "Shared drawing" }) as HTMLCanvasElement;
    pressAndMove(board);
    await userEvent.click(canvas.getByRole("button", { name: "Time’s up for Pip" }));
    release(board);

    await expect(args.onStrokeEnd).not.toHaveBeenCalled();
    await expect(turnEndsDrawing.strokes()).toEqual([expect.objectContaining({ playerId: 1 })]);
    await expect(turnEndsDrawing.live()).toBeNull();
  },
};
