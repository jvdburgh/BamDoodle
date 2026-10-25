import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { BrandLogo, LEAVING_EVENT } from "./BrandLogo.component";

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

/** Links don't navigate away from the story (a broken question would end the test run). */
const stayOnTheStory = () => {
  const stay = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
  };
  document.addEventListener("click", stay, true);
  return () => document.removeEventListener("click", stay, true);
};

/** In a room the logo asks first: Stay closes the question, and nothing leaves. */
export const InARoomAsksFirst: Story = {
  args: { named: true, href: "/", className: "size-10", confirmLeave: true },
  beforeEach: stayOnTheStory,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("link", { name: /^BamDoodle/ }));
    const question = canvas.getByRole("dialog", { name: "Leave the game?" });
    await expect(question).toHaveTextContent("Are you sure you want to leave the game?");
    await expect(within(question).getByRole("link", { name: "Leave" })).toHaveAttribute("href", "/");
    await userEvent.click(within(question).getByRole("button", { name: "Stay" }));
    await waitFor(() => expect(canvas.queryByRole("dialog", { name: "Leave the game?" })).toBeNull());
  },
};

/** Leave tells the room first, so its own "leave this page?" (`beforeunload`) doesn't ask a second time. */
export const LeaveAsksOnlyOnce: Story = {
  args: { named: true, href: "/", className: "size-10", confirmLeave: true },
  beforeEach: stayOnTheStory,
  play: async ({ canvas, userEvent }) => {
    const room = fn();
    window.addEventListener(LEAVING_EVENT, room);
    try {
      await userEvent.click(canvas.getByRole("link", { name: /^BamDoodle/ }));
      await expect(room).not.toHaveBeenCalled();
      const question = canvas.getByRole("dialog", { name: "Leave the game?" });
      await userEvent.click(within(question).getByRole("link", { name: "Leave" }));
      await expect(room).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(LEAVING_EVENT, room);
    }
  },
};

export const SwirlOnHover: Story = {
  args: { swirlOnHover: true, className: "size-32" },
  play: async ({ canvas, canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector(".logo-hover-swirl svg")).not.toBeNull());
    await expect(canvas.getByRole("img", { name: "BamDoodle" })).toBeVisible();
  },
};
