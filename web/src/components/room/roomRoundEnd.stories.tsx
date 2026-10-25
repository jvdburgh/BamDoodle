import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomRoundEnd } from "./RoomRoundEnd.component";
import { playersFixture } from "./_fixtures/players.fixture";
import { resultFixture } from "./_fixtures/roomState.fixture";

const players = playersFixture.slice(0, 4);
const result = resultFixture();

const meta = {
  title: "Room/RoomRoundEnd",
  component: RoomRoundEnd,
  decorators: [
    (Story) => (
      <div className="flex w-[24rem] flex-col gap-4">
        <Story />
      </div>
    ),
  ],
  args: {
    players,
    youId: 2,
    reveal: null,
    result,
    youAreBamboozler: false,
    totals: Object.fromEntries(result.scores.map((score) => [score.id, score.score])),
    isHost: false,
    hostScreen: null,
    hostName: "Juno",
    onGuess: fn(),
    onNextRound: fn(),
    onFinalScores: fn(),
  },
} satisfies Meta<typeof RoomRoundEnd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bamboozler's guess, the category as their clue, and what the reveal means for the points. */
export const YourGuess: Story = {
  args: {
    youId: 3,
    youAreBamboozler: true,
    result: null,
    reveal: {
      reveal: { bamboozlerId: 3, votes: result.votes, guessRemainingMs: 20_000 },
      playerIds: players.map((player) => player.id),
      category: "Animals",
      guessMsLeft: 18_000,
    },
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("2 of 3 spotted you: caught! +1 each for them")).toBeVisible();
    await userEvent.type(canvas.getByLabelText("Your guess"), "giraffe{Enter}");
    await expect(args.onGuess).toHaveBeenCalledWith("giraffe");
  },
};

/** Only who played the round counts: someone who joined during it isn't one of the artists. */
export const LateJoinerDoesNotCount: Story = {
  args: {
    players: playersFixture.slice(0, 5),
    result: null,
    reveal: {
      reveal: { bamboozlerId: 3, votes: result.votes, guessRemainingMs: 20_000 },
      playerIds: players.map((player) => player.id),
      category: "Animals",
      guessMsLeft: 18_000,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2 of 3 spotted Mo: caught! +1 each")).toBeVisible();
  },
};

/** Everyone else: this round's points, then who starts the next round, where the host's button would be. */
export const WaitingForTheHost: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "This round" })).toBeVisible();
    await expect(canvas.getByText("Waiting for Juno to start word 2…")).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const HostScreenStartsIt: Story = {
  args: { hostScreen: "Joris" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Joris starts word 2 from the big screen…")).toBeVisible();
  },
};

export const YouHost: Story = {
  args: { isHost: true, onSettings: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next round" }));
    await expect(args.onNextRound).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Room settings" }));
    await expect(args.onSettings).toHaveBeenCalled();
  },
};

/** After the last round anyone, not only the host, opens the final scores. */
export const LastRoundForEveryone: Story = {
  args: { result: resultFixture({ number: 5, gameOver: true }) },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByText(/Waiting for/)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "See the final scores" }));
    await expect(args.onFinalScores).toHaveBeenCalled();
  },
};
