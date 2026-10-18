import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { LobbyWaiting } from "./LobbyWaiting.component";

const meta = {
  title: "Lobby/LobbyWaiting",
  component: LobbyWaiting,
  parameters: { layout: "fullscreen" },
  args: {
    name: "Juno",
    roomCode: "BKZW",
    avatar: AvatarUtils.face(7),
    onAvatarChange: fn(),
    onStart: fn(),
  },
} satisfies Meta<typeof LobbyWaiting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Hi Juno! Draw your face" })).toHaveFocus();
    await expect(canvas.getByText("Room code", { exact: false }).parentElement).toHaveTextContent("BKZW");

    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(args.onAvatarChange).toHaveBeenCalledWith([]);

    await userEvent.click(canvas.getByRole("button", { name: "Go to the room" }));
    await expect(args.onStart).toHaveBeenCalledOnce();
  },
};
