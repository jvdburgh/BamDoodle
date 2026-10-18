import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandScribble } from "./BrandScribble.component";

const meta = {
  title: "Brand/BrandScribble",
  component: BrandScribble,
  args: { shape: "ring", seed: 1, className: "size-24 text-sun" },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("path")?.closest("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg?.querySelector("path")?.getAttribute("d")).toMatch(/^M/);
  },
} satisfies Meta<typeof BrandScribble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ring: Story = {};

export const Underline: Story = {
  args: { shape: "underline", className: "h-4 w-48 text-berry" },
};

export const Magnifier: Story = {
  args: { shape: "magnifier", className: "size-16 text-white" },
};
