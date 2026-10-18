import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomPlayerView } from "./RoomPlayerView.component";
import { useRoomSimulation } from "./_hooks/roomSimulation.hook";
import type { Attribution } from "./_types/room.types";
import { playersFixture, roomCodeFixture, setupFixture, wordsFixture } from "./_fixtures/players.fixture";

function PlayerWithSimulation({ attribution, width }: { attribution: Attribution; width: string }) {
  const sim = useRoomSimulation({
    players: playersFixture,
    youId: "juno",
    words: wordsFixture,
    setup: { ...setupFixture, mode: "classic", attribution },
  });
  return (
    <div style={{ width }}>
      <RoomPlayerView sim={sim} youId="juno" roomCode={roomCodeFixture} />
    </div>
  );
}

const meta = {
  title: "Room/RoomPlayerView",
  component: PlayerWithSimulation,
  parameters: { layout: "fullscreen" },
  args: { attribution: "free", width: "390px" },
} satisfies Meta<typeof PlayerWithSimulation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(6);
    await expect(canvas.getAllByRole("radio", { name: /Black|Berry|Lagoon/ })).toHaveLength(3);
  },
};

export const ShadesPerPlayer: Story = {
  args: { attribution: "shades" },
  play: async ({ canvas }) => {
    // Juno is the second seat, so Juno draws in the second family's shades.
    const swatches = canvas.getByRole("group", { name: "Colour" }).querySelectorAll("input[type=radio]");
    await expect(swatches).toHaveLength(5);
    await expect(canvas.getByRole("radio", { name: "Lagoon 3" })).toBeChecked();
  },
};

export const Tablet: Story = {
  args: { width: "1100px" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Draw", { exact: false })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Juno.*\(you\)/ })).toBeVisible();
  },
};
