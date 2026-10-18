import { useMemo, useState } from "react";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { LabPanel } from "@/components/lab/LabPanel.component";
import { LabPlayground } from "@/components/lab/LabPlayground.component";
import { wordCategoriesFixture } from "@/components/lab/_fixtures/words.fixture";
import { useLabSettings } from "@/components/lab/_hooks/labSettings.hook";
import type { RoomSetup } from "@/components/lab/_types/lab.types";
import { WordsUtils } from "@/components/lab/_utils/words.utils";
import { LobbySetup } from "@/components/lobby/LobbySetup.component";
import { LobbyStart } from "@/components/lobby/LobbyStart.component";
import { LobbyWaiting } from "@/components/lobby/LobbyWaiting.component";
import { playersFixture, roomCodeFixture } from "@/components/room/_fixtures/players.fixture";

const YOU = 2;
const catalogue = WordsUtils.catalogue(wordCategoriesFixture);

/**
 * The lab at /lab: the whole game on one device with simulated players, for trying the screens without a server.
 * The Lab panel switches screen, view, role and player count; `?panel` shows it on phones too.
 */
export function LabApp() {
  const { settings, update, reset } = useLabSettings();
  const [resets, setResets] = useState(0);
  const [yourName, setYourName] = useState("Juno");
  const [yourAvatar, setYourAvatar] = useState(() => AvatarUtils.face(Math.floor(Math.random() * 2 ** 31)));
  const [roomCode, setRoomCode] = useState(roomCodeFixture);
  const [justCreated, setJustCreated] = useState(false);
  /** Creating a room, like the real game: set it up, then your name. */
  const [creating, setCreating] = useState<"setup" | "name" | null>(null);
  const goCreate = (step: "setup" | "name" | null) => {
    setCreating(step);
    update({ screen: step === "setup" ? "setup" : "start" });
  };
  const setup: RoomSetup = {
    mode: settings.mode,
    turnsPerPlayer: settings.turnsPerPlayer,
    turnSeconds: settings.turnSeconds,
    rounds: settings.rounds,
    attribution: settings.attribution,
    language: settings.language,
    categories: WordsUtils.valid(wordCategoriesFixture, settings.language, settings.categories),
  };
  const categoriesKey = setup.categories.join(",");
  const words = useMemo(
    () => WordsUtils.deck(wordCategoriesFixture, setup.language, categoriesKey.split(","), resets + 1),
    [setup.language, categoriesKey, resets],
  );
  const players = useMemo(
    () =>
      playersFixture
        .slice(0, settings.players)
        .map((player) => (player.id === YOU ? { ...player, name: yourName, avatar: yourAvatar } : player)),
    [settings.players, yourName, yourAvatar],
  );

  return (
    <>
      {settings.screen === "start" ? (
        <LobbyStart
          key={creating ?? "start"}
          defaultName={yourName}
          step={creating === "name" ? "create" : undefined}
          onCreate={() => goCreate("setup")}
          onBack={creating === "name" ? () => goCreate("setup") : undefined}
          onEnter={(entry) => {
            setYourName(entry.name);
            setJustCreated(entry.kind === "create");
            setRoomCode(entry.kind === "join" ? entry.code : roomCodeFixture);
            setCreating(null);
            update({ screen: "lobby" });
          }}
        />
      ) : settings.screen === "setup" ? (
        <LobbySetup
          home="/lab?screen=start"
          roomCode={creating ? undefined : roomCode}
          doneLabel={creating ? "Next" : undefined}
          onBack={creating ? () => goCreate(null) : undefined}
          settings={setup}
          wordCategories={catalogue}
          onChange={({ mode, turnsPerPlayer, turnSeconds, rounds, language, categories }) =>
            update({ mode, turnsPerPlayer, turnSeconds, rounds, language, categories })
          }
          attribution={settings.attribution}
          onAttribution={(attribution) => update({ attribution })}
          onDone={() => (creating ? goCreate("name") : update({ screen: "lobby" }))}
        />
      ) : settings.screen === "lobby" ? (
        <LobbyWaiting
          home="/lab?screen=start"
          name={yourName}
          roomCode={roomCode}
          avatar={yourAvatar}
          onAvatarChange={setYourAvatar}
          onStart={() => update({ screen: "room" })}
        />
      ) : (
        <LabPlayground
          key={`${JSON.stringify(setup)}-${settings.players}-${settings.role}-${resets}`}
          players={players}
          youId={YOU}
          words={words}
          roomCode={roomCode}
          setup={setup}
          revealCode={justCreated}
          onRoundStart={() => setJustCreated(false)}
          view={settings.view}
          role={settings.role}
        />
      )}
      <LabPanel
        showOnPhones={new URLSearchParams(window.location.search).has("panel")}
        settings={settings}
        onChange={update}
        onReset={() => {
          reset();
          setResets((count) => count + 1);
        }}
      />
    </>
  );
}
