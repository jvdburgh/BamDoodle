import { useMemo, useState } from "react";
import { BrandSketchFilter } from "@/components/brand/BrandSketchFilter.component";
import { LabPanel } from "@/components/lab/LabPanel.component";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { LabPlayground } from "@/components/lab/LabPlayground.component";
import { useLabSettings } from "@/components/lab/_hooks/labSettings.hook";
import { LobbyStart } from "@/components/lobby/LobbyStart.component";
import { LobbyWaiting } from "@/components/lobby/LobbyWaiting.component";
import { playersFixture, roomCodeFixture } from "@/components/room/_fixtures/players.fixture";
import { wordCategoriesFixture } from "@/components/room/_fixtures/words.fixture";
import type { RoomSetup } from "@/components/room/_types/room.types";
import { WordsUtils } from "@/components/room/_utils/words.utils";

const YOU = "juno";

/** For now the app is the drawing playground: hot-seat only, nothing syncs between devices yet. */
export function App() {
  const { settings, update, reset } = useLabSettings();
  const [resets, setResets] = useState(0);
  const [yourName, setYourName] = useState("Juno");
  const [yourAvatar, setYourAvatar] = useState(() => AvatarUtils.face(Math.floor(Math.random() * 2 ** 31)));
  const [roomCode, setRoomCode] = useState(roomCodeFixture);
  const [justCreated, setJustCreated] = useState(false);
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
      <BrandSketchFilter />
      <h1 className="sr-only">BamDoodle playground</h1>
      {settings.screen === "start" ? (
        <LobbyStart
          defaultName={yourName}
          wordCategories={wordCategoriesFixture}
          onEnter={(entry) => {
            setYourName(entry.name);
            if (entry.kind === "create") {
              const { kind: _kind, name: _name, ...chosen } = entry;
              setRoomCode(roomCodeFixture);
              setJustCreated(true);
              update({ screen: "lobby", ...chosen });
            } else {
              setRoomCode(entry.code);
              setJustCreated(false);
              update({ screen: "lobby" });
            }
          }}
        />
      ) : settings.screen === "lobby" ? (
        <LobbyWaiting
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
        showOnPhones={new URLSearchParams(window.location.search).has("lab")}
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
