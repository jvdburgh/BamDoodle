import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { RoomJoinCard } from "./RoomJoinCard.component";
import { roomCodeFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomJoinCard",
  component: RoomJoinCard,
  args: { roomCode: roomCodeFixture },
} satisfies Meta<typeof RoomJoinCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
    await expect(canvas.getByText(`Room code ${roomCodeFixture}`)).toBeInTheDocument();
  },
};

export const HostScreen: Story = {
  args: { big: true, children: <span className="text-white/70">Waiting for players</span> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Waiting for players")).toBeVisible();
  },
};

export const RoomJustCreated: Story = {
  args: { reveal: true, children: <button type="button">Start round</button> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(`Room code ${roomCodeFixture}`)).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Start round" })).toBeVisible(), { timeout: 4000 });
  },
};
