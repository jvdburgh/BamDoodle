import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandSketchFilter } from "./BrandSketchFilter.component";

const meta = {
  title: "Brand/BrandSketchFilter",
  component: BrandSketchFilter,
  parameters: { sketchFilter: false },
  render: () => (
    <div className="sketchy size-32 rounded-3xl border-4 border-lagoon" data-testid="framed">
      <BrandSketchFilter />
    </div>
  ),
} satisfies Meta<typeof BrandSketchFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnAFrame: Story = {
  play: async ({ canvas }) => {
    const filter = canvas.getByTestId("framed").querySelector("filter#sketchy");
    await expect(filter?.querySelector("feTurbulence")).not.toBeNull();
    await expect(filter?.closest("svg")).toHaveAttribute("aria-hidden", "true");
  },
};
