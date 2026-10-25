import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { RoomRoundScores } from "./RoomRoundScores.component";
import { playersFixture } from "./_fixtures/players.fixture";
import { resultFixture } from "./_fixtures/roomState.fixture";

const meta = {
  title: "Room/RoomRoundScores",
  component: RoomRoundScores,
  decorators: [
    (Story) => (
      <div className="w-[24rem] p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    players: playersFixture.slice(0, 4),
    result: resultFixture(),
    totals: { 1: 3, 2: 1, 3: 0, 4: 2 },
    youId: 2,
  },
} satisfies Meta<typeof RoomRoundScores>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every player's round, most points first, with why and their total. */
export const ThisRound: Story = {
  play: async ({ canvas }) => {
    const rows = within(canvas.getByRole("list", { name: "This round" })).getAllByRole("listitem");
    await expect(rows).toHaveLength(4);
    await expect(rows[0]).toHaveTextContent("Pip");
    await expect(rows[0]).toHaveTextContent("voted Mo ✓");
    await expect(rows[0]).toHaveTextContent("+1");
    await expect(rows[0]).toHaveTextContent("3 points");
    const you = rows.find((row) => row.textContent?.includes("You"))!;
    await expect(you).toHaveTextContent("voted Kiki ✗");
    await waitFor(() => expect(canvas.getByText("caught")).toBeVisible());
  },
};

/** The host screen: the scoreboard, read from across the room. */
export const Big: Story = {
  args: { big: true, youId: null },
  decorators: [
    (Story) => (
      <div className="w-[40rem] p-3">
        <Story />
      </div>
    ),
  ],
};
