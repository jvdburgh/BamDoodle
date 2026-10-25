import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomResults } from "./RoomResults.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomResults",
  component: RoomResults,
  args: {
    players: playersFixture.slice(0, 4),
    bamboozlerId: 3,
    word: "Giraffe",
    guess: { text: "Horse", right: false },
    roundNumber: 2,
    rounds: 5,
    youId: 2,
    onNext: fn(),
  },
} satisfies Meta<typeof RoomResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AfterARound: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("End of round 2 of 5. The word was")).toBeVisible();
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.getByText("Mo guessed “Horse”: not it, no point.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next round" }));
    await expect(args.onNext).toHaveBeenCalled();
  },
};

export const GuessedIt: Story = {
  args: { guess: { text: "giraffe", right: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo guessed it: “giraffe”! +1")).toBeVisible();
  },
};

export const LastRoundForAPlayer: Story = {
  args: { roundNumber: 5, onNext: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
