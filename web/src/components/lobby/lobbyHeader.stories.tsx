import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LobbyHeader } from "./LobbyHeader.component";

const meta = {
  title: "Lobby/LobbyHeader",
  component: LobbyHeader,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LobbyHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the room exists (joining, your name, setting it up): the logo home and the toggles. */
export const BeforeTheRoom: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: /BamDoodle/ })).toHaveAttribute("href", "/");
    await expect(canvas.queryByText("Room")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Music" })).toBeVisible();
  },
};

/** In the room (its settings, your face): "Room BKZW", the same words everywhere. */
export const InTheRoom: Story = {
  args: { roomCode: "BKZW" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Room")).toHaveTextContent("Room BKZW");
  },
};
