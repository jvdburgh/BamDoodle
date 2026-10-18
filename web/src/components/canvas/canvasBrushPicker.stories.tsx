import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { CanvasBrushPicker } from "./CanvasBrushPicker.component";
import { CanvasTools } from "./_utils/canvasTools.utils";

const meta = {
  title: "Canvas/CanvasBrushPicker",
  component: CanvasBrushPicker,
  decorators: [
    (Story) => (
      <div className="rounded-2xl bg-night-deep p-4">
        <Story />
      </div>
    ),
  ],
  args: { brushes: CanvasTools.brushes, value: 0.014, color: "#2da8c3", onChange: fn() },
} satisfies Meta<typeof CanvasBrushPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeSizes: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getAllByRole("radio")).toHaveLength(3);
    await expect(canvas.getByRole("radio", { name: "Medium" })).toBeChecked();
    await userEvent.click(canvas.getByRole("radio", { name: "Bold" }));
    await expect(args.onChange).toHaveBeenCalledWith(0.03);
  },
};
