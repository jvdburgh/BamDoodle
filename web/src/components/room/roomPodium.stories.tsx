import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomPodium } from "./RoomPodium.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomPodium",
  component: RoomPodium,
  parameters: { layout: "fullscreen" },
  args: {
    players: playersFixture,
    totals: { 1: 4, 2: 7, 3: 5, 4: 2, 5: 5, 6: 1 },
    youId: 2,
    onNewGame: fn(),
    startPage: "/",
  },
} satisfies Meta<typeof RoomPodium>;

export default meta;
type Story = StoryObj<typeof meta>;

export const YouWin: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "You win!" })).toBeInTheDocument();
    const podium = canvas.getByRole("list", { name: "Podium" });
    await expect(podium.children).toHaveLength(3);
    await expect(canvas.getByText("7 pts")).toBeInTheDocument();
    await expect(canvas.getByText("The End")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Play again in this room" }));
    await expect(args.onNewGame).toHaveBeenCalled();
    await expect(canvas.getByRole("link", { name: "Create a new room" })).toHaveAttribute("href", "/?start=create");
    await expect(canvas.getByRole("link", { name: "Join another room" })).toHaveAttribute("href", "/?start=join");
    await expect(canvas.getByRole("complementary", { name: "Did you enjoy the game?" })).toBeInTheDocument();
  },
};

/** Everyone but the host: another room, or wait for the host's new game. */
export const NotTheHost: Story = {
  args: { onNewGame: undefined, hostName: "Pip" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Pip can start a new game in this room.")).toBeInTheDocument();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const Tie: Story = {
  args: { totals: { 1: 3, 2: 3, 3: 1 }, players: playersFixture.slice(0, 3) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "It’s a tie!" })).toBeInTheDocument();
  },
};
