import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomJoinQr } from "./RoomJoinQr.component";
import { roomCodeFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomJoinQr",
  component: RoomJoinQr,
  args: { roomCode: roomCodeFixture, className: "size-48" },
} satisfies Meta<typeof RoomJoinQr>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Points a phone camera at this site's own room address, so it works the same on bamdoodle.io and in dev. */
export const RoomAddress: Story = {
  play: async ({ canvas }) => {
    const code = canvas.getByRole("img", { name: `QR code to join: ${window.location.origin}/${roomCodeFixture}` });
    await expect(code).toBeVisible();
    await expect(code.querySelector("path")?.getAttribute("d")).toMatch(/^M\d/);
  },
};

export const Small: Story = {
  args: { className: "size-16" },
};
