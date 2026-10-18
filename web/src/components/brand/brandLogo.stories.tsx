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

/** The top-left of every screen: the whole block is the link home. */
export const Named: Story = {
  args: { named: true, href: "/", className: "size-10" },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: /^BamDoodle\s+Draw/ });
    await expect(link).toHaveAttribute("href", "/");
    await expect(link).toHaveTextContent("Draw • Guess • Deceive");
    await expect(canvas.queryByRole("img", { name: "BamDoodle" })).toBeNull();
  },
};

/** The bamboozler's logo in the room header: still one link, named by the text, the moving logo hidden from it. */
export const SlyNamed: Story = {
  args: { sly: true, named: true, href: "/", className: "size-10" },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector(".logo-sly svg")).not.toBeNull());
    await expect(canvas.getByRole("link", { name: /^BamDoodle\s+Draw/ })).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
    await expect(canvasElement.querySelector(".logo-sly")).toHaveAttribute("aria-hidden", "true");
    await expect(canvasElement.querySelector("img")).toHaveAttribute("alt", "");
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
