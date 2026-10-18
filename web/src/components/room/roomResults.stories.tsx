import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomResults } from "./RoomResults.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomResults",
  component: RoomResults,
  args: {
    players: playersFixture.slice(0, 4),
    bamboozlerId: "mo",
    word: "Giraffe",
    guess: { text: "Horse", right: false },
    scores: {
      pip: { points: 1, right: true },
      juno: { points: 0, right: false },
      kiki: { points: 1, right: true },
      mo: { points: 0, right: false },
    },
    totals: { pip: 3, juno: 1, kiki: 2, mo: 2 },
    roundNumber: 2,
    rounds: 5,
    youId: "juno",
    onNext: fn(),
  },
} satisfies Meta<typeof RoomResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AfterARound: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.getByText("Mo guessed “Horse”. Nope.")).toBeVisible();
    const rows = canvas.getAllByRole("row").slice(1);
    await expect(rows[0]).toHaveTextContent("Pip");
    await userEvent.click(canvas.getByRole("button", { name: "Next round" }));
    await expect(args.onNext).toHaveBeenCalled();
  },
};

export const LastRoundForAPlayer: Story = {
  args: { roundNumber: 5, onNext: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
