import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
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
    drawing: drawingFixture(),
    vote: null,
    onVote: fn(),
    onConsider: fn(),
  },
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

export const PickThenVote: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Who’s sketchy?" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Juno/ })).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: /Consider Mo/ }));
    await expect(args.onConsider).toHaveBeenLastCalledWith("mo");
    await expect(args.onVote).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("button", { name: /Consider Kiki/ }));
    await expect(args.onConsider).toHaveBeenLastCalledWith("kiki");
    await userEvent.click(canvas.getByRole("button", { name: "Vote Kiki" }));
    await expect(args.onVote).toHaveBeenCalledWith("kiki");
    await expect(args.onConsider).toHaveBeenLastCalledWith(null);
    await expect(canvas.getByText(/No take-backs/)).toHaveFocus();
    await expect(canvas.queryByRole("button", { name: /Consider/ })).toBeNull();
  },
};

export const TimesUp: Story = {
  args: { prompt: true },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Time’s up! Who’s sketchy?" })).toBeVisible());
  },
};

export const PickSurvivesTimesUp: Story = {
  render: function Render(args) {
    const [prompt, setPrompt] = useState(false);
    return (
      <>
        <VoteBallot {...args} prompt={prompt} />
        <button type="button" onClick={() => setPrompt(true)} className="mt-2 text-white">
          Run out the clock
        </button>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Consider Mo/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Run out the clock" }));
    await expect(canvas.getByRole("button", { name: /Consider Mo/ })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: "Vote Mo" })).toBeVisible();
  },
};
