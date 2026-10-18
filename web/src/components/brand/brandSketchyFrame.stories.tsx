import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandSketchyFrame } from "./BrandSketchyFrame.component";

const meta = {
  title: "Brand/BrandSketchyFrame",
  component: BrandSketchyFrame,
  args: { className: "text-sun" },
  render: (args) => (
    <div className="relative rounded-2xl bg-night-soft px-8 py-6 font-display text-2xl">
      Who’s sketchy?
      <BrandSketchyFrame {...args} />
    </div>
  ),
} satisfies Meta<typeof BrandSketchyFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("Who’s sketchy?")).toBeVisible();
    const frame = canvasElement.querySelector(".sketchy");
    await expect(frame).toHaveAttribute("aria-hidden", "true");
    await expect(document.getElementById("sketchy")).not.toBeNull();
  },
};
