import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomRoundClock } from "./RoomRoundClock.component";

const meta = {
  title: "Room/RoomRoundClock",
  component: RoomRoundClock,
  args: { msLeft: 41_200 },
} satisfies Meta<typeof RoomRoundClock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("0:42")).toBeVisible();
    await expect(canvas.getByText("0:42")).not.toHaveClass("text-berry");
  },
};

export const HostScreenVote: Story = {
  args: { big: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("0:42")).toHaveClass("text-8xl");
  },
};

export const LastSeconds: Story = {
  args: { msLeft: 7_400 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("0:08")).toHaveClass("text-berry");
  },
};
