import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomProgress } from "./RoomProgress.component";

const meta = {
  title: "Room/RoomProgress",
  component: RoomProgress,
  args: {
    roundNumber: 2,
    rounds: 5,
    turn: 1,
    turnsPerPlayer: 3,
    phase: "drawing",
    turnTitle: "Your turn",
    msLeft: 11_200,
    msTotal: 15_000,
  },
} satisfies Meta<typeof RoomProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Drawing: Story = {
  play: async ({ canvas }) => {
    const progress = canvas.getByRole("status", { name: "Round progress" });
    await expect(progress).toHaveTextContent("Round 2/5");
    await expect(progress).toHaveTextContent("Turn 1 of 3");
    await expect(canvas.getByText("Your turn")).toBeVisible();
    await expect(canvas.getByText("12s")).toBeVisible();
  },
};

export const FinalVote: Story = {
  args: { phase: "voting", msLeft: 24_000, msTotal: 30_000 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Final vote")).toBeVisible();
    await expect(canvas.getByText("0:24")).toBeVisible();
    await expect(canvas.queryByText(/Turn \d/)).toBeNull();
  },
};
