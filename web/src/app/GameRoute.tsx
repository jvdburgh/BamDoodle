import { useEffect, useState } from "react";
import { LobbySetup } from "@/components/lobby/LobbySetup.component";
import { LobbyStart, type LobbyEntry } from "@/components/lobby/LobbyStart.component";
import { RoomPlayerView } from "@/components/room/RoomPlayerView.component";
import { useRoomSounds } from "@/components/room/_hooks/roomSounds.hook";
import type { RoomViewState } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import { useRoomConnection } from "@/protocol/room.hook";

const NAME_KEY = "bamdoodle:name";

function savedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // No storage: you type your name again next time.
  }
}

/**
 * Playing on this device: the start page, then the room through a live connection. Whoever creates the room sets it
 * up first. A connection that gives up (no such room, name taken, replaced) brings you back to the start page; every
 * try gets a fresh connection.
 */
export function GameRoute({ joinCode }: { joinCode?: string }) {
  const [attempt, setAttempt] = useState<{ number: number; entry: LobbyEntry } | null>(null);
  const enter = (entry: LobbyEntry) => {
    saveName(entry.name);
    setAttempt((last) => ({ number: (last?.number ?? 0) + 1, entry }));
  };

  if (!attempt) return <LobbyStart defaultName={savedName()} defaultCode={joinCode} onEnter={enter} />;
  return <GameConnection key={attempt.number} entry={attempt.entry} onEnter={enter} />;
}

function GameConnection({ entry, onEnter }: { entry: LobbyEntry; onEnter: (entry: LobbyEntry) => void }) {
  const { connection, state } = useRoomConnection(
    entry.kind === "create" ? { kind: "create", name: entry.name } : entry,
  );
  const status = state?.status;
  const gaveUp = status === "failed" || status === "replaced" || status === "closed";

  if (!gaveUp && connection && RoomViewUtils.inRoom(state)) {
    return (
      <GameRoom state={state} send={(message) => connection.send(message)} createdHere={entry.kind === "create"} />
    );
  }

  const problem = !gaveUp
    ? undefined
    : status === "replaced"
      ? RoomViewUtils.problem("replaced")
      : state?.failure
        ? RoomViewUtils.problem(state.failure)
        : "Couldn’t reach the game. Check your connection and try again.";
  return (
    <LobbyStart
      defaultName={entry.name}
      defaultCode={entry.kind === "join" ? entry.code : undefined}
      step={entry.kind}
      problem={problem}
      busy={!gaveUp}
      onEnter={onEnter}
    />
  );
}

type GameRoomProps = {
  state: RoomViewState;
  send: (message: ClientMessage) => void;
  /** You made this room: set it up first, and play the room-created moment. */
  createdHere: boolean;
};

function GameRoom({ state, send, createdHere }: GameRoomProps) {
  const { room } = state;
  const isHost = room.hostId !== null && room.hostId === state.you;
  const betweenRounds = room.phase.phase === "lobby" || room.phase.phase === "finished";
  const [settingUp, setSettingUp] = useState(createdHere);
  /** What the host is picking; only complete settings go to the server, which sends them back to everyone. */
  const [draft, setDraft] = useState<RoomSettings | null>(null);
  const playing = room.phase.phase === "drawing" || room.phase.phase === "voting" || room.phase.phase === "guessing";
  useRoomSounds(state);

  // The address becomes the room's link: share it, or reload and join again with one tap.
  useEffect(() => {
    const path = `/join/${room.code}`;
    if (window.location.pathname !== path) window.history.replaceState(null, "", path);
  }, [room.code]);

  // Mid-round, leaving (the logo, reload, closing the tab) asks first, with the browser's own prompt.
  useEffect(() => {
    if (!playing) return;
    const confirmLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [playing]);

  if (settingUp && isHost && betweenRounds) {
    return (
      <LobbySetup
        roomCode={room.code}
        settings={draft ?? room.settings}
        wordCategories={room.wordCategories}
        onChange={(settings) => {
          setDraft(settings);
          if (settings.categories.length > 0) send({ type: "updateSettings", settings });
        }}
        onDone={() => {
          setSettingUp(false);
          setDraft(null);
        }}
      />
    );
  }

  return (
    <main>
      <RoomPlayerView
        state={state}
        send={send}
        revealCode={createdHere}
        onSettings={
          isHost && betweenRounds
            ? () => {
                setDraft(null);
                setSettingUp(true);
              }
            : undefined
        }
      />
    </main>
  );
}
