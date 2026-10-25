import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { RoomHostView } from "./RoomHostView.component";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
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

/** A room takes up to eight: the two seats past the shared six-seat fixture, for the host screen's full room. */
const extraSeats = [
  { id: 7, name: "Noor", seed: 9 },
  { id: 8, name: "Jip", seed: 27 },
].map(({ id, name, seed }) => ({
  id,
  name,
  score: 0,
  connected: true,
  avatar: AvatarUtils.toWire(AvatarUtils.face(seed)),
  ready: true,
}));

/** A host screen's state (`watchRoom`): made at render time, so the countdowns start when the story does. */
function HostFromState({ phase, reconnecting = false, hosting = false, players, onStart, onSettings }: Props) {
  const [state] = useState(() => {
    const base = roomStateFixture({ phase, you: null, hostScreen: hosting ? "Joris" : null, players });
    const fixture = {
      ...base,
      room: { ...base.room, players: [...base.room.players, ...extraSeats.slice(0, Math.max(0, (players ?? 0) - 6))] },
      hosting,
    };
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

/** The header says whose turn it is and how long they have left; the corner says how to get in, with a QR code. */
export const NeverShowsTheWord: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/^Pip’s turn · \d+s$/)).toBeVisible();
    await expect(canvas.getByText("Animals")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.queryByRole("region", { name: "Drawing tools" })).toBeNull();
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
    await expect(canvas.getByRole("img", { name: /^QR code to join: .*\/BKZW$/ })).toBeVisible();
    await settle();
    await expect(wornHats(canvas.getByRole("list", { name: "Players" }))).toHaveLength(0);
  },
};

export const Lobby: Story = {
  args: { phase: { phase: "lobby" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Juno starts the round from their phone.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Start round" })).toBeNull();
    await expect(canvas.getByText("One stroke · 3 turns each · 5 rounds · English · 2 categories")).toBeVisible();
  },
};

/** Nobody's in yet: scan the code, or type the address and the room code. */
export const EmptyLobby: Story = {
  args: { phase: { phase: "lobby" }, hosting: true, players: 0, onStart: fn(), onSettings: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Scan or go to", { exact: false })).toHaveTextContent(
      "Scan or go to bamdoodle.io and type",
    );
    await expect(canvas.getByText("Room code BKZW")).toBeInTheDocument();
    await expect(canvas.getByRole("img", { name: /^QR code to join: .*\/BKZW$/ })).toBeVisible();
  },
};

/** This screen hosts: the join card comes first, then Start round and the settings, then who's in. */
export const HostingTheLobby: Story = {
  args: { phase: { phase: "lobby" }, hosting: true, onStart: fn(), onSettings: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("One stroke · 3 turns each · 5 rounds · English · 2 categories")).toBeVisible();
    const code = canvas.getByText("Scan or go to", { exact: false });
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
    await expect(canvas.getByText(/1 more player needed to start/)).toBeVisible();
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
    await userEvent.click(canvas.getByRole("button", { name: "Room settings" }));
    await expect(args.onSettings).toHaveBeenCalled();
  },
};

export const FinalVote: Story = {
  args: {
    phase: { phase: "voting", round: hostRound({ activePlayerId: null, voted: [1, 4] }), votingRemainingMs: 30_000 },
  },
  play: async ({ canvas }) => {
    // The vote slides in over the drawing.
    await waitFor(() => expect(canvas.getByText("Vote on your phone.", { exact: false })).toBeVisible());
    await expect(canvas.getByText("2 of 6 voted")).toBeVisible();
    await expect(canvas.getByText("0:30")).toBeVisible();
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
    // The drawing stays the stage; the reveal slides in over it.
    await expect(canvas.getByRole("img", { name: "Shared drawing." })).toBeVisible();
    await expect(canvas.getByText("Who’s sketchy?")).toBeVisible();
    await waitFor(() => expect(canvas.getByText("The bamboozler was…")).toBeVisible());
    await expect(canvas.getByText("Mo gets one guess at the word…")).toBeVisible();
  },
};

/** The word over the drawing, and the scoreboard beside it: this round's points and why, with the totals. */
export const Results: Story = {
  args: { phase: { phase: "finished", result: resultFixture(), strokes: strokeViewsFixture } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Shared drawing." })).toBeVisible();
    await waitFor(() => expect(canvas.getByText("Giraffe")).toBeVisible());
    await expect(canvas.getByText("Word 1’s scores")).toBeVisible();
    const scores = canvas.getByRole("list", { name: "This round" });
    await expect(scores.querySelector("li")).toHaveTextContent(/^Pip.*voted Mo ✓\+11 point$/);
    await expect(canvas.queryByRole("button", { name: "Next round" })).toBeNull();
  },
};

export const Reconnecting: Story = {
  args: { reconnecting: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Lost the connection. Getting back in…")).toBeVisible();
  },
};

const paintedMiniMaps = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLButtonElement>('button[aria-label^="Spotlight"]')].filter((button) => {
    const map = button.querySelector("canvas");
    const data = map?.getContext("2d")?.getImageData(0, 0, map.width, map.height).data ?? [];
    for (let i = 3; i < data.length; i += 4) if (data[i]) return true;
    return false;
  });

/**
 * The drawing is over: the mini-maps still show who drew what (they once went blank here; the cause is covered by
 * `Canvas/CanvasMiniMap` `WithoutTheBoard`).
 */
export const MiniMapsInTheReveal: Story = {
  args: {
    phase: {
      phase: "guessing",
      round: hostRound({ activePlayerId: null }),
      reveal: { bamboozlerId: 3, votes: resultFixture().votes, guessRemainingMs: 20_000 },
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(paintedMiniMaps(canvasElement).length).toBeGreaterThan(0));
  },
};

/** A full room of eight: every tile stays on one row on a laptop and up. */
export const FullLobby: Story = {
  args: { phase: { phase: "lobby" }, hosting: true, players: 8, onStart: fn(), onSettings: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("8 players")).toBeVisible();
    await expect(canvas.getByText("Jip")).toBeInTheDocument();
  },
};

/** Eight in the column beside the drawing: a size smaller, still all on one screen. */
export const FullRoomReveal: Story = {
  args: {
    players: 8,
    phase: {
      phase: "guessing",
      round: hostRound({ activePlayerId: null }),
      reveal: { bamboozlerId: 3, votes: resultFixture().votes, guessRemainingMs: 20_000 },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("button", { name: /^Spotlight / })).toHaveLength(8);
  },
};
