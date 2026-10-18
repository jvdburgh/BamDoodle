import { RoomPlayground } from "@/components/room/RoomPlayground.component";
import { playersFixture, wordsFixture } from "@/components/room/_fixtures/players.fixture";

export function App() {
  return <RoomPlayground players={playersFixture} youId="juno" words={wordsFixture} />;
}
