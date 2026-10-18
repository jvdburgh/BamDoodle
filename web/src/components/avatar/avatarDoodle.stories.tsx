import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
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

export const IdentityRing: Story = {
  args: { strokes: drawnAvatarFixture, color: "#2da8c3", label: "Kiki" },
  play: async ({ canvas }) => {
    const [background, ring] = canvas.getByRole("img", { name: "Kiki" }).querySelectorAll("circle");
    // A Lagoon player who draws in Lagoon still sees their lines: the colour goes around the face, not behind it.
    await expect(background).not.toHaveAttribute("style");
    await expect(getComputedStyle(background as Element).fill).not.toBe("rgb(45, 168, 195)");
    await expect(ring).toHaveAttribute("stroke", "#2da8c3");
    await expect(ring).toHaveAttribute("fill", "none");
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
