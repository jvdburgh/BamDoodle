import { useMemo, useState } from "react";
import { BrandSketchFilter } from "@/components/brand/BrandSketchFilter.component";
import { LabPanel } from "@/components/lab/LabPanel.component";
import { LabPlayground } from "@/components/lab/LabPlayground.component";
import { useLabSettings } from "@/components/lab/_hooks/labSettings.hook";
import { LobbyStart } from "@/components/lobby/LobbyStart.component";
import { playersFixture, roomCodeFixture, wordsFixture } from "@/components/room/_fixtures/players.fixture";

const YOU = "juno";

/** For now the app is the drawing playground: hot-seat only, nothing syncs between devices yet. */
export function App() {
  const { settings, update, reset } = useLabSettings();
  const [resets, setResets] = useState(0);
  const [yourName, setYourName] = useState("Juno");
  const [roomCode, setRoomCode] = useState(roomCodeFixture);
  const [justCreated, setJustCreated] = useState(false);
  const players = useMemo(
    () =>
      playersFixture
        .slice(0, settings.players)
        .map((player) => (player.id === YOU ? { ...player, name: yourName } : player)),
    [settings.players, yourName],
  );

  return (
    <>
      <BrandSketchFilter />
      <h1 className="sr-only">BamDoodle playground</h1>
      {settings.screen === "start" ? (
        <LobbyStart
          defaultName={yourName}
          onEnter={(entry) => {
            setYourName(entry.name);
            if (entry.kind === "create") {
              const { mode, roundSeconds, attribution } = entry;
              setRoomCode(roomCodeFixture);
              setJustCreated(true);
              update({ screen: "room", mode, roundSeconds, attribution });
            } else {
              setRoomCode(entry.code);
              setJustCreated(false);
              update({ screen: "room" });
            }
          }}
        />
      ) : (
        <LabPlayground
          key={`${settings.mode}-${settings.attribution}-${settings.roundSeconds}-${settings.seats}-${settings.players}-${resets}`}
          players={players}
          youId={YOU}
          words={wordsFixture}
          roomCode={roomCode}
          revealCode={justCreated}
          onRoundStart={() => setJustCreated(false)}
          view={settings.view}
          role={settings.role}
          mode={settings.mode}
          attribution={settings.attribution}
          roundSeconds={settings.roundSeconds}
          seats={settings.seats}
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
