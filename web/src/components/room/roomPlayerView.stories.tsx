import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor, within } from "storybook/test";
import { RoomPlayerView } from "./RoomPlayerView.component";
import { resultFixture, roomStateFixture, roundFixture, strokeViewsFixture } from "./_fixtures/roomState.fixture";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { PhaseView } from "@/protocol/generated/PhaseView";
import type { RejectReason } from "@/protocol/generated/RejectReason";

type Props = {
  phase: PhaseView;
  you: number;
  hostId: number;
  /** Who hosts the room on a screen: no player starts rounds. */
  hostScreen?: string;
  width: string;
  rejection?: RejectReason;
  /** A vote you sent that the server hasn't confirmed yet. */
  pendingVote?: number;
  /** Players still drawing their face (not `ready`). */
  drawingFaces?: number[];
  send: (message: ClientMessage) => void;
  onSettings?: () => void;
};

/** Renders the view from a server-state fixture made at render time, so the countdowns start when the story does. */
function PlayerFromState({
  phase,
  you,
  hostId,
  hostScreen,
  width,
  rejection,
  pendingVote,
  drawingFaces = [],
  send,
  onSettings,
}: Props) {
  const [state] = useState(() => {
    const base = roomStateFixture({ phase, you, hostScreen: hostScreen ?? null, hostId: hostScreen ? null : hostId });
    const room = base.room && {
      ...base.room,
      players: base.room.players.map((player) => ({ ...player, ready: !drawingFaces.includes(player.id) })),
    };
    const fixture = { ...base, room, pendingVote: pendingVote ?? null };
    return rejection ? { ...fixture, rejection: { reason: rejection, at: Date.now() } } : fixture;
  });
  return (
    <div style={{ width }}>
      <RoomPlayerView state={state} send={send} onSettings={onSettings} />
    </div>
  );
}

/** Fedoras anyone can see right now: worn ones, not the faint preview that waits for a hover. */
const wornHats = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLImageElement>('img[src$="/hat.svg"]')].filter(
    (hat) => Number(getComputedStyle(hat).opacity) > 0.5,
  );
const settle = () => new Promise((resolve) => setTimeout(resolve, 900));

const meta = {
  title: "Room/RoomPlayerView",
  component: PlayerFromState,
  parameters: { layout: "fullscreen" },
  args: {
    phase: { phase: "drawing", round: roundFixture() },
    you: 2,
    hostId: 2,
    width: "390px",
    send: fn(),
  },
} satisfies Meta<typeof PlayerFromState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Watching: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await settle();
    await expect(wornHats(canvas.getByRole("list", { name: "Players" }))).toHaveLength(0);
    // In the header, and right in your face as the round starts.
    await expect(canvas.getAllByText("Giraffe")).toHaveLength(2);
    await expect(canvas.getByRole("status", { name: "" })).toHaveTextContent("The secret word is");
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    // On a phone: everyone in the strip at the top, no tools while someone else draws.
    await expect(within(canvas.getByRole("list", { name: "Players" })).getAllByRole("listitem")).toHaveLength(6);
    await expect(canvas.queryAllByRole("radio", { name: /Black|Berry|Lagoon/ })).toHaveLength(0);

    await userEvent.click(canvas.getByRole("button", { name: /^Mo\b/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Mark as suspicious" }));
    await expect(args.send).toHaveBeenCalledWith({ type: "suspect", suspectId: 3 });
  },
};

export const YourTurn: Story = {
  args: { phase: { phase: "drawing", round: roundFixture({ activePlayerId: 2, strokes: [] }) } },
  play: async ({ args, canvas }) => {
    const board = canvas.getByRole("img", { name: "Shared drawing. Your turn to draw." }) as HTMLCanvasElement;
    const box = board.getBoundingClientRect();
    const at = (x: number, y: number): PointerEventInit => ({
      clientX: box.left + x * box.width,
      clientY: box.top + y * box.height,
      pointerId: 1,
      pointerType: "mouse",
      pressure: 0.5,
      button: 0,
      buttons: 1,
      bubbles: true,
    });
    board.dispatchEvent(new PointerEvent("pointerdown", at(0.2, 0.2)));
    for (let i = 1; i <= 5; i++) board.dispatchEvent(new PointerEvent("pointermove", at(0.2 + i * 0.1, 0.3)));
    board.dispatchEvent(new PointerEvent("pointerup", at(0.7, 0.3)));

    await expect(args.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "beginStroke", colour: "#000000", size: "medium", points: [[0.2, 0.2, 0.5]] }),
    );
    await waitFor(() => expect(args.send).toHaveBeenLastCalledWith({ type: "endStroke" }));
    const extended = (args.send as ReturnType<typeof fn>).mock.calls.filter(
      ([message]) => message.type === "extendStroke",
    );
    await expect(extended.flatMap(([message]) => message.points).at(-1)).toEqual([0.7, 0.3, 0.5]);

    // On a phone the tools are pinned to the bottom on your turn: always in view, the colours in one row.
    const tools = canvas.getByRole("region", { name: "Drawing tools" });
    await expect(getComputedStyle(tools).position).toBe("fixed");
    await expect(tools.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1);
    const swatchTops = canvas
      .getAllByRole("radio", { name: /Black|Berry|Lagoon/ })
      .map((radio) => Math.round(radio.closest("label")!.getBoundingClientRect().top));
    await expect(new Set(swatchTops).size).toBe(1);
  },
};

export const Bamboozler: Story = {
  args: { phase: { phase: "drawing", round: roundFixture({ word: null, role: "bamboozler" }) } },
  play: async ({ canvas }) => {
    // Right in their face as the round starts, then just in the header.
    await expect(canvas.getByText("You’re the bamboozler!")).toBeInTheDocument();
    await expect(canvas.getByText("You’re the bamboozler")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
    // Only on their own screen, only on their own face.
    const players = canvas.getByRole("list", { name: "Players" });
    await waitFor(() => expect(wornHats(players)).toHaveLength(1));
    await expect(wornHats(within(players).getByRole("button", { name: /You/ }))).toHaveLength(1);
  },
};

/** The "?" opens this room's rules and how to play, over the game, and closes again. */
export const HowToPlay: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "How to play" }));
    const sheet = within(canvas.getByRole("dialog", { name: "How to play" }));
    await expect(sheet.getByRole("heading", { name: "This room" })).toBeVisible();
    await expect(sheet.getByText(/rounds, each with a new secret word/)).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "Spot the bamboozler" })).toBeVisible();
    await userEvent.click(sheet.getByRole("button", { name: "Close" }));
    await expect(canvas.queryByRole("dialog", { name: "How to play" })).toBeNull();
  },
};

export const InARoomWithAHostScreen: Story = {
  args: { phase: { phase: "lobby" }, hostScreen: "Joris" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Joris starts the round from the big screen…")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Start round" })).toBeNull();
  },
};

export const HostInTheLobby: Story = {
  args: { phase: { phase: "lobby" }, onSettings: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("6 players in the room")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /TV/ })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Room settings" }));
    await expect(args.onSettings).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(args.send).toHaveBeenCalledWith({ type: "startRound" });
  },
};

/** The host can see who's still on their face screen, and can still start. */
export const HostWaitsForFaces: Story = {
  args: { phase: { phase: "lobby" }, drawingFaces: [3, 4] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo and Kiki are still drawing their faces")).toBeVisible();
    await expect(canvas.getAllByText("drawing their face")).toHaveLength(2);
    await expect(canvas.getByRole("button", { name: "Start round" })).toBeEnabled();
  },
};

export const GuestInTheLobby: Story = {
  args: { phase: { phase: "lobby" }, you: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Waiting for Juno to start…")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Start round" })).toBeNull();
  },
};

export const TurnedDown: Story = {
  args: { phase: { phase: "lobby" }, rejection: "notEnoughPlayers" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Not enough players yet");
  },
};

export const FinalVote: Story = {
  args: {
    phase: {
      phase: "voting",
      round: roundFixture({ activePlayerId: null, voted: [1], suspicions: [{ playerId: 2, suspectId: 4 }] }),
      votingRemainingMs: 30_000,
    },
  },
  play: async ({ args, canvas, userEvent }) => {
    // A sheet over everything, with the drawing in it and a big Vote button per player.
    const sheet = within(canvas.getByRole("dialog", { name: "Who’s sketchy?" }));
    await expect(sheet.getByRole("img", { name: "The finished drawing." })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Vote Mo" }).getBoundingClientRect().height).toBeGreaterThanOrEqual(
      44,
    );
    await expect(canvas.getByText(/your suspicion of/)).toHaveTextContent("your suspicion of Kiki counts");
    // A suspicion from the drawing isn't a vote: nothing says "Your vote" until you tap.
    await expect(canvas.getByRole("button", { name: "Vote for Kiki" })).toHaveAttribute("aria-pressed", "false");
    await expect(canvas.queryByRole("button", { name: /^Your vote/ })).toBeNull();
    const kiki = canvas.getByRole("button", { name: "Vote Kiki" }).closest("li")!;
    await expect(kiki).toHaveTextContent("you suspected");
    await expect(canvas.queryByRole("button", { name: /Lock in/ })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Vote for Mo" }));
    await expect(args.send).toHaveBeenCalledWith({ type: "castVote", suspectId: 3 });
  },
};

/** What the server turned down shows inside the sheet, which covers the page. */
export const VoteTurnedDown: Story = {
  args: {
    phase: { phase: "voting", round: roundFixture({ activePlayerId: null }), votingRemainingMs: 30_000 },
    rejection: "invalidVote",
  },
  play: async ({ canvas }) => {
    const sheet = within(canvas.getByRole("dialog", { name: "Who’s sketchy?" }));
    await expect(sheet.getByRole("alert")).toBeVisible();
  },
};

/** Kiki was confirmed, then you tapped Mo: Mo shows as your vote, and a tap back on Kiki isn't swallowed. */
export const ChangeYourVote: Story = {
  args: {
    phase: {
      phase: "voting",
      round: roundFixture({ activePlayerId: null, voted: [2], yourVote: 4 }),
      votingRemainingMs: 30_000,
    },
    pendingVote: 3,
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "Vote for Mo" })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: "Vote for Kiki" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(canvas.getByRole("button", { name: "Vote for Kiki" }));
    await expect(args.send).toHaveBeenLastCalledWith({ type: "castVote", suspectId: 4 });
  },
};

export const YourGuess: Story = {
  args: {
    you: 3,
    phase: {
      phase: "guessing",
      round: roundFixture({ activePlayerId: null, word: null, role: "bamboozler" }),
      reveal: { bamboozlerId: 3, votes: resultFixture().votes, guessRemainingMs: 20_000 },
    },
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("One guess: what was the word?")).toBeVisible();
    await userEvent.type(canvas.getByLabelText("Your guess"), "Horse");
    await userEvent.click(canvas.getByRole("button", { name: "Guess" }));
    await expect(args.send).toHaveBeenCalledWith({ type: "guessWord", guess: "Horse" });
  },
};

export const ResultsForTheHost: Story = {
  args: { phase: { phase: "finished", result: resultFixture(), strokes: strokeViewsFixture } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Round 1 of 5. The word was")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next round" }));
    await expect(args.send).toHaveBeenCalledWith({ type: "startRound" });
  },
};

export const ResultsForEveryoneElse: Story = {
  args: { phase: { phase: "finished", result: resultFixture(), strokes: strokeViewsFixture }, you: 4 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "Next round" })).toBeNull();
    await expect(canvas.getByText("Waiting for Juno to start the next round…")).toBeVisible();
  },
};

export const GameOver: Story = {
  args: {
    phase: { phase: "finished", result: resultFixture({ number: 5, gameOver: true }), strokes: strokeViewsFixture },
    you: 4,
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "See the final scores" }));
    await expect(canvas.getByRole("list", { name: "Podium" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "New game" })).toBeNull();
  },
};

export const Laptop: Story = {
  args: { width: "1100px" },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText("you")).toBeVisible());
    await expect(canvas.getByRole("status", { name: "Round progress" })).toHaveTextContent("Pip’s turn");
    // The canvas is sized to the screen's height, so the tools under it are in view.
    const tools = canvas.getByRole("region", { name: "Drawing tools" });
    await expect(tools.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    const board = canvas.getByRole("img", { name: /Shared drawing/ }).closest("[class*='max-w']")!;
    await expect(getComputedStyle(board).maxWidth).not.toBe("none");
  },
};
