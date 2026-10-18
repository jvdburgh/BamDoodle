import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomFeed } from "./RoomFeed.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomFeed",
  component: RoomFeed,
  args: {
    players: playersFixture,
    lines: [
      { id: 1, at: 0, kind: "suspect", voterId: 1, suspectId: 3, beforeId: null },
      { id: 2, at: 0, kind: "suspect", voterId: 2, suspectId: 1, beforeId: 3 },
      { id: 3, at: 0, kind: "voted", voterId: 5 },
    ],
  },
} satisfies Meta<typeof RoomFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnAPhone: Story = {
  args: { youId: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("list", { name: "Table talk" })).toHaveAttribute("aria-live", "polite");
    await expect(canvas.getByText("Pip thinks Mo is sketchy")).toBeInTheDocument();
    await expect(canvas.getByText("You now suspect Pip")).toBeInTheDocument();
    await expect(canvas.getByText("Rafa has voted")).toBeInTheDocument();
  },
};

export const OnTheHostScreen: Story = {
  args: { big: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Juno now suspects Pip")).toBeInTheDocument();
  },
};
