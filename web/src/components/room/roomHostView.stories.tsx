import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { RoomHostView } from "./RoomHostView.component";
import { hostRound, resultFixture, roomStateFixture, strokeViewsFixture } from "./_fixtures/roomState.fixture";
import type { PhaseView } from "@/protocol/generated/PhaseView";

/** A host screen's state (`watchRoom`): made at render time, so the countdowns start when the story does. */
function HostFromState({ phase, reconnecting = false }: { phase: PhaseView; reconnecting?: boolean }) {
  const [state] = useState(() => {
    const fixture = roomStateFixture({ phase, you: null });
    return reconnecting ? { ...fixture, status: "reconnecting" as const } : fixture;
  });
  return <RoomHostView state={state} />;
}

/** Fedoras anyone can see right now: worn ones, not the faint preview that waits for a hover. */
const wornHats = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLImageElement>('img[src$="/hat.svg"]')].filter(
    (hat) => Number(getComputedStyle(hat).opacity) > 0.5,
  );
const settle = () => new Promise((resolve) => setTimeout(resolve, 900));

const meta = {
  title: "Room/RoomHostView",
  component: HostFromState,
  parameters: { layout: "fullscreen" },
  args: { phase: { phase: "drawing", round: hostRound() } },
} satisfies Meta<typeof HostFromState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NeverShowsTheWord: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Who’s sketchy?")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.queryByRole("region", { name: "Drawing tools" })).toBeNull();
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
    await settle();
    await expect(wornHats(canvas.getByRole("list", { name: "Players" }))).toHaveLength(0);
  },
};

export const Lobby: Story = {
  args: { phase: { phase: "lobby" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Juno starts the round from their phone.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Start round" })).toBeNull();
  },
};

export const FinalVote: Story = {
  args: {
    phase: { phase: "voting", round: hostRound({ activePlayerId: null, voted: [1, 4] }), votingRemainingMs: 30_000 },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Vote on your phone.", { exact: false })).toBeVisible();
    await expect(canvas.getByText("2 of 6 voted")).toBeVisible();
  },
};

export const RevealAndGuess: Story = {
  args: {
    phase: {
      phase: "guessing",
      round: hostRound({ activePlayerId: null }),
      reveal: { bamboozlerId: 3, votes: resultFixture().votes, guessRemainingMs: 20_000 },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo gets one guess at the word…")).toBeVisible();
  },
};

export const Results: Story = {
  args: { phase: { phase: "finished", result: resultFixture(), strokes: strokeViewsFixture } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Next round" })).toBeNull();
  },
};

export const Reconnecting: Story = {
  args: { reconnecting: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Lost the connection. Getting back in…")).toBeVisible();
  },
};
