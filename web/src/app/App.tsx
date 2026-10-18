import { useMemo, useState, type CSSProperties } from "react";
import { BrandSketchFilter } from "@/components/brand/BrandSketchFilter.component";
import { LabPanel } from "@/components/lab/LabPanel.component";
import { useLabSettings } from "@/components/lab/_hooks/labSettings.hook";
import { LabSettingsUtils } from "@/components/lab/_utils/labSettings.utils";
import { LobbyStart } from "@/components/lobby/LobbyStart.component";
import { LabPlayground } from "@/components/lab/LabPlayground.component";
import { playersFixture, roomCodeFixture, wordsFixture } from "@/components/room/_fixtures/players.fixture";

const YOU = "juno";

/** For now the app is the drawing playground: hot-seat only, nothing syncs between devices yet. */
export function App() {
  const { settings, update, reset } = useLabSettings();
  const [resets, setResets] = useState(0);
  const [yourName, setYourName] = useState("Juno");
  const [roomCode, setRoomCode] = useState(roomCodeFixture);
  const font = LabSettingsUtils.fonts[settings.font];
  const players = useMemo(
    () =>
      playersFixture
        .slice(0, settings.players)
        .map((player) => (player.id === YOU ? { ...player, name: yourName } : player)),
    [settings.players, yourName],
  );
  const fontStyle = {
    "--font-display": `${font.family}, "Work Sans Variable", system-ui, sans-serif`,
    "--display-weight": font.weight,
  } as CSSProperties;

  return (
    <div style={fontStyle}>
      <BrandSketchFilter />
      <h1 className="sr-only">BamDoodle playground</h1>
      {settings.screen === "start" ? (
        <LobbyStart
          defaultName={yourName}
          onEnter={(entry) => {
            setYourName(entry.name);
            setRoomCode(entry.kind === "join" ? entry.code : roomCodeFixture);
            update(entry.kind === "create" ? { screen: "room", mode: entry.mode } : { screen: "room" });
          }}
        />
      ) : (
        <LabPlayground
          key={`${settings.mode}-${settings.attribution}-${settings.seats}-${settings.players}-${resets}`}
          players={players}
          youId={YOU}
          words={wordsFixture}
          roomCode={roomCode}
          view={settings.view}
          role={settings.role}
          mode={settings.mode}
          attribution={settings.attribution}
          seats={settings.seats}
          surface={settings.surface}
        />
      )}
      <LabPanel
        settings={settings}
        onChange={update}
        onReset={() => {
          reset();
          setResets((count) => count + 1);
        }}
      />
    </div>
  );
}
