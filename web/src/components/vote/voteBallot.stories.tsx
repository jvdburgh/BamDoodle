import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { playersFixture } from "@/components/room/_fixtures/players.fixture";
import { VoteBallot } from "./VoteBallot.component";

const meta = {
  title: "Vote/VoteBallot",
  component: VoteBallot,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: { candidates: playersFixture.filter((player) => player.id !== "juno"), vote: null, onVote: fn() },
  render: function Render(args) {
    const [vote, setVote] = useState(args.vote);
    return (
      <VoteBallot
        {...args}
        vote={vote}
        onVote={(id) => {
          setVote(id);
          args.onVote(id);
        }}
      />
    );
  },
} satisfies Meta<typeof VoteBallot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneVoteOnly: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Who’s sketchy?" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Juno/ })).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Vote for Mo" }));
    await expect(args.onVote).toHaveBeenCalledWith("mo");
    await expect(canvas.getByText("You voted Mo")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Vote for Mo" })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: "Vote for Mo" })).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Vote for Kiki" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Vote for Kiki" }));
    await expect(args.onVote).toHaveBeenCalledTimes(1);
  },
};
