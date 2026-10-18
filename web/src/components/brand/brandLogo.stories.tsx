import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
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

export const Sly: Story = {
  args: { sly: true, className: "size-16" },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector(".logo-sly svg")).not.toBeNull());
    await expect(canvas.getByRole("img", { name: "BamDoodle" })).toBeVisible();
  },
};

export const SlyHomeLink: Story = {
  args: { sly: true, href: "/?screen=start", className: "size-11" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "BamDoodle" })).toHaveAttribute("href", "/?screen=start");
  },
};
