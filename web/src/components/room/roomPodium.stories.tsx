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
    totals: { pip: 4, juno: 7, mo: 5, kiki: 2, rafa: 5, tess: 1 },
    youId: "juno",
    onNewGame: fn(),
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
    await userEvent.click(canvas.getByRole("button", { name: "New game" }));
    await expect(args.onNewGame).toHaveBeenCalled();
  },
};

export const Tie: Story = {
  args: { totals: { pip: 3, juno: 3, mo: 1 }, players: playersFixture.slice(0, 3) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "It’s a tie!" })).toBeInTheDocument();
  },
};
