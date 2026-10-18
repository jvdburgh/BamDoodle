import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { drawingFixture } from "@/components/canvas/_fixtures/drawing.fixture";
import { playersFixture } from "@/components/room/_fixtures/players.fixture";
import { VoteBallot } from "./VoteBallot.component";

const meta = {
  title: "Vote/VoteBallot",
  component: VoteBallot,
  decorators: [
    (Story) => (
      <div className="w-[24rem]">
        <Story />
      </div>
    ),
  ],
  argTypes: { drawing: { control: false } },
  args: {
    candidates: playersFixture.filter((player) => player.id !== "juno"),
    players: playersFixture,
    drawing: drawingFixture(),
    mode: "suspect",
    suspicion: null,
    vote: null,
    onSuspect: fn(),
    onVote: fn(),
    onConsider: fn(),
  },
  render: function Render(args) {
    const [suspicion, setSuspicion] = useState(args.suspicion);
    const [vote, setVote] = useState(args.vote);
    return (
      <VoteBallot
        {...args}
        suspicion={suspicion}
        vote={vote}
        onSuspect={(id) => {
          setSuspicion(id);
          args.onSuspect(id);
        }}
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

export const SuspectWhileDrawing: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Tap who you suspect. You can change your mind.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Juno/ })).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: /Suspect Mo/ }));
    await expect(args.onSuspect).toHaveBeenLastCalledWith("mo");
    await expect(args.onConsider).toHaveBeenLastCalledWith("mo");
    await userEvent.click(canvas.getByRole("button", { name: /Suspect Kiki/ }));
    await expect(args.onSuspect).toHaveBeenLastCalledWith("kiki");
    await expect(canvas.getByRole("button", { name: /Suspect Kiki/ })).toHaveAttribute("aria-pressed", "true");
    await expect(args.onVote).not.toHaveBeenCalled();
  },
};

export const FinalVote: Story = {
  args: { mode: "final", suspicion: "mo", msLeft: 24_000, votedIds: ["pip", "kiki"] },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Who do you think didn’t know the word?")).toBeVisible();
    await expect(canvas.getByText("0:24")).toBeVisible();
    await expect(canvas.getByText("2 of 6 voted")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Pip has voted" })).toBeVisible();

    await expect(canvas.getByRole("button", { name: /Choose Mo/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: /Choose Rafa/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Lock in my vote for Rafa" }));
    await expect(args.onVote).toHaveBeenCalledWith("rafa");
    await expect(args.onSuspect).not.toHaveBeenCalled();
    await expect(canvas.getByText(/No take-backs/)).toHaveFocus();
  },
};

export const FinalVoteWithoutSuspicion: Story = {
  args: { mode: "final" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Pick someone first" })).toBeDisabled();
  },
};
