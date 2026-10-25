import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { RoomHostView } from "./RoomHostView.component";
import { hostRound, resultFixture, roomStateFixture, strokeViewsFixture } from "./_fixtures/roomState.fixture";
import type { PhaseView } from "@/protocol/generated/PhaseView";

type Props = {
  phase: PhaseView;
  reconnecting?: boolean;
  /** This screen hosts the room (`hostRoom`): Start round and the settings are here. */
  hosting?: boolean;
  players?: number;
  onStart?: () => void;
  onSettings?: () => void;
};

/** A host screen's state (`watchRoom`): made at render time, so the countdowns start when the story does. */
function HostFromState({ phase, reconnecting = false, hosting = false, players, onStart, onSettings }: Props) {
  const [state] = useState(() => {
    const fixture = { ...roomStateFixture({ phase, you: null, hostScreen: hosting, players }), hosting };
    return reconnecting ? { ...fixture, status: "reconnecting" as const } : fixture;
  });
  return (
    <RoomHostView state={state} controls={hosting && onStart && onSettings ? { onStart, onSettings } : undefined} />
  );
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

/** This screen hosts: the join card comes first, then Start round and the settings, then who's in. */
export const HostingTheLobby: Story = {
  args: { phase: { phase: "lobby" }, hosting: true, onStart: fn(), onSettings: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const code = canvas.getByText("Join at", { exact: false });
    const players = canvas.getByRole("list", { name: "Players" });
    await expect(code.compareDocumentPosition(players) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(args.onStart).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Room settings" }));
    await expect(args.onSettings).toHaveBeenCalled();
  },
};

export const HostingWaitsForPlayers: Story = {
  args: { phase: { phase: "lobby" }, hosting: true, players: 2, onStart: fn(), onSettings: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Start round" })).toBeDisabled();
    await expect(canvas.getByText("Waiting for 1 more player")).toBeVisible();
  },
};

export const HostingTheNextRound: Story = {
  args: {
    phase: { phase: "finished", result: resultFixture(), strokes: strokeViewsFixture },
    hosting: true,
    onStart: fn(),
    onSettings: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next round" }));
    await expect(args.onStart).toHaveBeenCalled();
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
