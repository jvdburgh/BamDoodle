import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { playersFixture } from "@/components/room/_fixtures/players.fixture";
import { VotePrompt } from "./VotePrompt.component";

const mo = playersFixture[2];

const meta = {
  title: "Vote/VotePrompt",
  component: VotePrompt,
  decorators: [
    (Story) => (
      <div className="w-[24rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    players: playersFixture,
    voted: undefined,
    suspected: undefined,
    votedIds: [1, 4],
    msLeft: 24_000,
  },
} satisfies Meta<typeof VotePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TapAFace: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Tap the face of who you think didn’t know the word.")).toBeVisible();
    await expect(canvas.getByText("0:24")).toBeVisible();
    await expect(canvas.getByText("2 of 6 voted")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Pip has voted" })).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

/** Not voted yet: the suspicion from the drawing counts when the time runs out. */
export const YourSuspicionCounts: Story = {
  args: { suspected: mo },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/your suspicion of/)).toHaveTextContent(`your suspicion of ${mo?.name} counts`);
  },
};

export const Voted: Story = {
  args: { voted: mo, votedIds: [1, 4, 2] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/You voted/)).toHaveTextContent(
      `You voted ${mo?.name}. Tap another face to change it.`,
    );
  },
};
