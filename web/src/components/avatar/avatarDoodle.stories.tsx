import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { AvatarDoodle } from "./AvatarDoodle.component";

const meta = {
  title: "Avatar/AvatarDoodle",
  component: AvatarDoodle,
  args: { seed: 12, className: "size-32" },
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

export const Faces: Story = {
  render: (args) => (
    <div className="grid grid-cols-6 gap-3">
      {Array.from({ length: 24 }, (_, seed) => (
        <AvatarDoodle key={seed} {...args} seed={seed} label={`Face ${seed}`} className="size-16" />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(24);
  },
};
