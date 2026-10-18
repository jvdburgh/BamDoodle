import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandLogo } from "./BrandLogo.component";

const meta = {
  title: "Brand/BrandLogo",
  component: BrandLogo,
  args: { className: "size-32" },
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "BamDoodle" })).toBeVisible();
  },
};

export const HomeLink: Story = {
  args: { href: "/?screen=start" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "BamDoodle" })).toHaveAttribute("href", "/?screen=start");
  },
};
