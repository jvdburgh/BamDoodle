import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomHostView } from "./RoomHostView.component";
import { useRoomSimulation } from "./_hooks/roomSimulation.hook";
import { playersFixture, roomCodeFixture, wordsFixture } from "./_fixtures/players.fixture";

function HostWithSimulation({ surface }: { surface: "paper" | "night" }) {
  const sim = useRoomSimulation({
    players: playersFixture,
    youId: null,
    words: wordsFixture,
    mode: "timed",
    attribution: "free",
  });
  return <RoomHostView sim={sim} roomCode={roomCodeFixture} surface={surface} />;
}

const meta = {
  title: "Room/RoomHostView",
  component: HostWithSimulation,
  parameters: { layout: "fullscreen" },
  args: { surface: "paper" },
} satisfies Meta<typeof HostWithSimulation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NeverShowsTheWord: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
    await expect(canvas.getByText("Who’s sketchy?")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.queryByRole("region", { name: "Drawing tools" })).toBeNull();
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
  },
};

export const NightSheet: Story = {
  args: { surface: "night" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Shared drawing." })).toBeVisible();
  },
};
