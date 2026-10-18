import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomConfetti } from "./RoomConfetti.component";

const meta = {
  title: "Room/RoomConfetti",
  component: RoomConfetti,
  render: () => (
    <div className="relative h-80 w-96 bg-night-deep">
      <RoomConfetti />
    </div>
  ),
} satisfies Meta<typeof RoomConfetti>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Falling: Story = {
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector(".animate-confetti")?.parentElement;
    await expect(layer).toHaveClass("motion-reduce:hidden");
    await expect(layer?.children.length).toBe(40);
  },
};
