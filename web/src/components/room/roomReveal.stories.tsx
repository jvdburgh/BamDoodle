import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomReveal } from "./RoomReveal.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomReveal",
  component: RoomReveal,
  args: {
    players: playersFixture.slice(0, 4),
    bamboozlerId: 3,
    votes: { 1: 3, 2: 4, 4: 3, 3: 1 },
    youId: 2,
  },
} satisfies Meta<typeof RoomReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SomeCaughtThem: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("The bamboozler was…")).toBeVisible();
    await expect(canvas.getByText("2 of 3 caught them")).toBeVisible();
    await expect(canvas.getAllByText("right")).toHaveLength(2);
  },
};

export const YouWereIt: Story = {
  args: { bamboozlerId: 2, votes: {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nobody caught them!")).toBeVisible();
  },
};
