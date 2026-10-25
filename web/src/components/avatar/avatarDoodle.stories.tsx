import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { AvatarDoodle } from "./AvatarDoodle.component";
import { drawnAvatarFixture } from "./_fixtures/avatar.fixture";
import { AvatarUtils } from "./_utils/avatar.utils";

const meta = {
  title: "Avatar/AvatarDoodle",
  component: AvatarDoodle,
  args: { strokes: AvatarUtils.face(12), className: "size-32" },
} satisfies Meta<typeof AvatarDoodle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Labelled: Story = {
  args: { label: "Pip" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Pip" })).toBeVisible();
  },
};

export const Decorative: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole("img")).toBeNull();
    await expect(canvasElement.querySelector("circle")?.closest("svg")).toHaveAttribute("aria-hidden", "true");
  },
};

export const Drawn: Story = {
  args: { strokes: drawnAvatarFixture, label: "Kiki" },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole("img", { name: "Kiki" });
    const fills = [...avatar.querySelectorAll("path")].map((path) => path.getAttribute("fill"));
    await expect(fills).toHaveLength(drawnAvatarFixture.length);
    await expect(fills).toEqual(expect.arrayContaining(["#ffffff", "#f9a8c0", "#fbb03b", "#2da8c3"]));
    await expect(getComputedStyle(avatar).clipPath).toContain("circle");
  },
};

export const Empty: Story = {
  args: { strokes: [], label: "Nobody drew yet" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Nobody drew yet" }).querySelectorAll("path")).toHaveLength(0);
  },
};

export const Small: Story = {
  render: (args) => (
    <div className="flex items-end gap-3">
      {["size-6", "size-9", "size-11", "size-16"].map((size) => (
        <AvatarDoodle key={size} {...args} className={size} />
      ))}
    </div>
  ),
  args: { strokes: drawnAvatarFixture },
};

export const Faces: Story = {
  render: (args) => (
    <div className="grid grid-cols-6 gap-3">
      {Array.from({ length: 24 }, (_, seed) => (
        <AvatarDoodle
          key={seed}
          {...args}
          strokes={AvatarUtils.face(seed)}
          label={`Face ${seed}`}
          className="size-16"
        />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(24);
  },
};

export const WearingTheHat: Story = {
  args: { hat: "worn", className: "mt-12 size-32" },
  play: async ({ canvasElement }) => {
    const hat = canvasElement.querySelector("img")!;
    await waitFor(() => expect(Number(getComputedStyle(hat).opacity)).toBe(1));
  },
};

export const HatPreviewOnFocus: Story = {
  args: { hat: "preview", className: "mt-12 size-32" },
  render: (args) => (
    <button type="button" aria-label="Suspect Pip" className="group rounded-full">
      <AvatarDoodle {...args} />
    </button>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const hat = canvasElement.querySelector("img")!;
    const opacity = () => Number(getComputedStyle(hat).opacity);
    await expect(opacity()).toBe(0);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Suspect Pip" })).toHaveFocus();
    await waitFor(() => expect(opacity()).toBeGreaterThan(0.5));
  },
};
