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

/** Half or more spotted them: caught, a point for each who did. */
export const SomeCaughtThem: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("The bamboozler was…")).toBeVisible();
    await expect(canvas.getByText("2 of 3 spotted Mo: caught! +1 each")).toBeVisible();
  },
};

/** Fewer than half spotted them: they slip through, and that's a point for them. */
export const SlipsThrough: Story = {
  args: { votes: { 1: 3, 2: 4, 4: 1, 3: 1 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1 of 3 spotted Mo, so Mo slips through (+1)")).toBeVisible();
  },
};

export const EveryoneSpottedThem: Story = {
  args: { votes: { 1: 3, 2: 3, 4: 3 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Everyone spotted Mo! +1 each")).toBeVisible();
  },
};

export const YouWereIt: Story = {
  args: { bamboozlerId: 2, votes: {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nobody spotted you! You +1")).toBeVisible();
  },
};
