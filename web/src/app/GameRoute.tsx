import { useCallback, useEffect, useState } from "react";
import { RouteUtils } from "@/app/route.utils";
import type { AvatarStroke } from "@/components/avatar/_types/avatar.types";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { LobbySetup } from "@/components/lobby/LobbySetup.component";
import { LobbyStart, type LobbyEntry } from "@/components/lobby/LobbyStart.component";
import { LobbyWaiting } from "@/components/lobby/LobbyWaiting.component";
import { RoomPlayerView } from "@/components/room/RoomPlayerView.component";
import { useRoomSounds } from "@/components/room/_hooks/roomSounds.hook";
import { useMusic } from "@/components/sound/_hooks/sound.hook";
import { MusicUtils } from "@/components/sound/_utils/music.utils";
import type { RoomViewState } from "@/components/room/_types/room.types";
import { RoomViewUtils } from "@/components/room/_utils/roomView.utils";
import type { ClientMessage } from "@/protocol/generated/ClientMessage";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";
import type { WordCategory } from "@/protocol/generated/WordCategory";
import type { RoomDefaults } from "@/protocol/generated/RoomDefaults";
import { RoomDefaultsUtils } from "@/protocol/roomDefaults.utils";
import { HostRoom } from "@/app/WatchRoute";
import { useRoomConnection } from "@/protocol/room.hook";
import { RoomConnection } from "@/protocol/roomConnection";

const NAME_KEY = "bamdoodle:name";
const UNREACHABLE = "Couldn’t reach the game. Check your connection and try again.";

/** A new release reloads now, not after the whole setup. */
async function loadDefaults(): Promise<RoomDefaults | null | "reloading"> {
  if (await RoomConnection.reloadIfOutdated()) return "reloading";
  return RoomDefaultsUtils.fetch();
}

/** From the end of a game (`/?start=create`, `/?start=join`): open straight on setting up a room, or on joining one. */
function startFromLink(): "create" | "join" | null {
  const start = new URLSearchParams(window.location.search).get("start");
  return start === "create" || start === "join" ? start : null;
}

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

/** A room being created: set up before it exists, so your name is clearly yours and not the room's. */
type RoomPlan = { step: "setup" | "name"; settings: RoomSettings; wordCategories: WordCategory[] };

type LobbyNavigation = {
  onEnter: (entry: LobbyEntry) => void;
  onCreate: () => void;
  /** Back from your name to the room setup. */
  onBackToSetup: () => void;
};

/**
 * Playing on this device: the start page, then the room through a live connection. Creating a room is setting it up,
 * then your name, then the room. A connection that gives up (no such room, name taken, replaced) brings you back to
 * the start page; every try gets a fresh connection.
 */
export function GameRoute({ joinCode }: { joinCode?: string }) {
  const [attempt, setAttempt] = useState<{ number: number; entry: LobbyEntry } | null>(null);
  const [plan, setPlan] = useState<RoomPlan | null>(null);
  /** Used once: after that the start page is the usual choice again. */
  const [startWith, setStartWith] = useState(startFromLink);
  const [loading, setLoading] = useState(startWith === "create");
  const [problem, setProblem] = useState<string>();
  /** Back from creating, or it couldn't start: Create a room gets the focus again. */
  const [backFromCreate, setBackFromCreate] = useState(false);
  // From the start page on, so it's already playing in the room; the room's own music (ducking) takes over there.
  useMusic(false, MusicUtils.onByDefault());

  const showSetup = useCallback((defaults: RoomDefaults | null) => {
    setLoading(false);
    if (defaults) setPlan({ step: "setup", ...defaults });
    else {
      setProblem(UNREACHABLE);
      setBackFromCreate(true);
    }
  }, []);
  const create = () => {
    setStartWith(null);
    setAttempt(null);
    setProblem(undefined);
    setLoading(true);
    void loadDefaults().then((defaults) => defaults !== "reloading" && showSetup(defaults));
  };

  // The link did its job: a reload is the plain start page again.
  useEffect(() => {
    if (!startWith) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (startWith === "create") {
      void loadDefaults().then((defaults) => defaults !== "reloading" && showSetup(defaults));
    }
  }, [startWith, showSetup]);

  const navigation: LobbyNavigation = {
    onEnter: (entry) => {
      saveName(entry.name);
      setAttempt((last) => ({ number: (last?.number ?? 0) + 1, entry }));
    },
    onCreate: create,
    onBackToSetup: () => {
      setAttempt(null);
      setPlan((current) => current && { ...current, step: "setup" });
    },
  };

  if (attempt) {
    const settings = attempt.entry.kind === "create" ? plan?.settings : undefined;
    return <GameConnection key={attempt.number} entry={attempt.entry} settings={settings} {...navigation} />;
  }
  if (plan?.step === "setup") {
    return (
      <LobbySetup
        settings={plan.settings}
        wordCategories={plan.wordCategories}
        onChange={(settings) => setPlan({ ...plan, settings })}
        onDone={() => setPlan({ ...plan, step: "name" })}
        doneLabel="Next"
        onBack={() => {
          setPlan(null);
          setBackFromCreate(true);
        }}
      />
    );
  }
  return (
    <LobbyStart
      key={plan ? "name" : "start"}
      defaultName={savedName()}
      defaultCode={joinCode}
      step={plan ? "create" : startWith === "join" ? "join" : undefined}
      problem={problem}
      busy={loading}
      focusCreate={backFromCreate}
      onEnter={navigation.onEnter}
      onCreate={navigation.onCreate}
      onBack={plan ? navigation.onBackToSetup : undefined}
    />
  );
}

type GameConnectionProps = LobbyNavigation & {
  entry: LobbyEntry;
  /** The room you set up before creating it: the create carries it. */
  settings?: RoomSettings;
};

function GameConnection({ entry, settings, onEnter, onCreate, onBackToSetup }: GameConnectionProps) {
  const { connection, state } = useRoomConnection(
    entry.kind === "create"
      ? { kind: "create", name: entry.name, settings }
      : entry.kind === "host"
        ? { kind: "host", name: entry.name, settings }
        : entry,
  );
  const status = state?.status;
  const gaveUp = status === "failed" || status === "replaced" || status === "closed";

  if (!gaveUp && connection && RoomViewUtils.inRoom(state)) {
    if (entry.kind === "host") return <HostRoom state={state} connection={connection} createdHere />;
    return <GameRoom state={state} connection={connection} createdHere={entry.kind === "create"} />;
  }

  const problem = !gaveUp
    ? undefined
    : status === "replaced"
      ? RoomViewUtils.problem("replaced")
      : state?.failure
        ? RoomViewUtils.problem(state.failure)
        : UNREACHABLE;
  return (
    <LobbyStart
      defaultName={entry.name}
      defaultCode={entry.kind === "join" ? entry.code : undefined}
      step={entry.kind === "host" ? "create" : entry.kind}
      problem={problem}
      busy={!gaveUp}
      onEnter={onEnter}
      onCreate={onCreate}
      onBack={entry.kind === "join" ? undefined : onBackToSetup}
    />
  );
}

type GameRoomProps = {
  state: RoomViewState;
  connection: RoomConnection;
  /** You made this room (already set up): play the room-created moment. */
  createdHere: boolean;
};

function GameRoom({ state, connection, createdHere }: GameRoomProps) {
  const { room } = state;
  const send = (message: ClientMessage) => connection.send(message);
  const you = room.players.find((player) => player.id === state.you);
  /** Your face: draw or tweak it in the lobby before going to the room. */
  const [avatar, setAvatar] = useState<AvatarStroke[] | null>(null);
  const [drawingFace, setDrawingFace] = useState(room.phase.phase === "lobby");
  const isHost = room.hostId !== null && room.hostId === state.you;
  const betweenRounds = room.phase.phase === "lobby" || room.phase.phase === "finished";
  const [settingUp, setSettingUp] = useState(false);
  /** What the host is picking; only complete settings go to the server, which sends them back to everyone. */
  const [draft, setDraft] = useState<RoomSettings | null>(null);
  const playing = room.phase.phase === "drawing" || room.phase.phase === "voting" || room.phase.phase === "guessing";
  useRoomSounds(state);

  // Past the face screen (or skipped it, joining mid-round): the host no longer waits for your face.
  useEffect(() => {
    if (!drawingFace) connection.markReady();
  }, [drawingFace, connection]);

  // The address becomes the room's link: share it, or reload and join again with one tap.
  useEffect(() => {
    const path = RouteUtils.roomPath(room.code);
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

  if (drawingFace && you) {
    const face = avatar ?? AvatarUtils.fromWire(you.avatar);
    return (
      <LobbyWaiting
        name={you.name}
        roomCode={room.code}
        avatar={face}
        onAvatarChange={(strokes) => {
          setAvatar(strokes);
          connection.setAvatar(AvatarUtils.toWire(strokes));
        }}
        onStart={() => {
          if (avatar === null) connection.setAvatar(AvatarUtils.toWire(face));
          connection.flushAvatar();
          setDrawingFace(false);
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
