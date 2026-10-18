import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
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
    picked: mo,
    voted: undefined,
    onLock: fn(),
    votedIds: ["pip", "kiki"],
    msLeft: 24_000,
  },
  render: function Render(args) {
    const [voted, setVoted] = useState(args.voted);
    return (
      <VotePrompt
        {...args}
        voted={voted}
        onLock={(id) => {
          setVoted(args.players.find((player) => player.id === id));
          args.onLock(id);
        }}
      />
    );
  },
} satisfies Meta<typeof VotePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LockIn: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Who do you think didn’t know the word? Pick them on their card.")).toBeVisible();
    await expect(canvas.getByText("0:24")).toBeVisible();
    await expect(canvas.getByText("2 of 6 voted")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Pip has voted" })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Lock in my vote for Mo" }));
    await expect(args.onLock).toHaveBeenCalledWith("mo");
    await expect(canvas.getByText(/No take-backs/)).toHaveFocus();
  },
};

export const NothingPickedYet: Story = {
  args: { picked: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Pick someone on the cards" })).toBeDisabled();
  },
};
