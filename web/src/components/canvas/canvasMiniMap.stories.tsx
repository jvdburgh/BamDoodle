import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { CanvasMiniMap } from "./CanvasMiniMap.component";
import { drawingFixture } from "./_fixtures/drawing.fixture";
import { giraffeStrokesFixture } from "./_fixtures/strokes.fixture";
import { DrawingUtils } from "./_utils/drawing.utils";

const meta = {
  title: "Canvas/CanvasMiniMap",
  component: CanvasMiniMap,
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
  argTypes: { drawing: { control: false } },
  args: { drawing: drawingFixture(), playerId: 4, label: "Kiki’s lines" },
} satisfies Meta<typeof CanvasMiniMap>;

export default meta;
type Story = StoryObj<typeof meta>;

function paintedPixels(canvas: HTMLCanvasElement) {
  const data = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data ?? [];
  let painted = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]) painted++;
  return painted;
}

export const OnePlayer: Story = {
  play: async ({ canvas }) => {
    const map = canvas.getByRole("img", { name: "Kiki’s lines" }) as HTMLCanvasElement;
    await waitFor(() => expect(paintedPixels(map)).toBeGreaterThan(0));
  },
};

export const NothingDrawnYet: Story = {
  args: { playerId: 99, label: "Nobody’s lines" },
  play: async ({ canvas }) => {
    const map = canvas.getByRole("img", { name: "Nobody’s lines" }) as HTMLCanvasElement;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await expect(paintedPixels(map)).toBe(0);
  },
};

/** No big canvas shows the drawing (the host screen's results): the mini-map still shows the strokes. */
export const WithoutTheBoard: Story = {
  args: {
    drawing: (() => {
      const drawing = DrawingUtils.createDrawing();
      drawing.load(giraffeStrokesFixture);
      return drawing;
    })(),
  },
  play: async ({ canvas }) => {
    const map = canvas.getByRole("img", { name: "Kiki’s lines" }) as HTMLCanvasElement;
    await waitFor(() => expect(paintedPixels(map)).toBeGreaterThan(0));
  },
};
