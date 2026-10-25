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
    await expect(canvas.getByText("Room")).toHaveTextContent("Room BKZW");

    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(args.onAvatarChange).toHaveBeenCalledWith([]);

    await userEvent.click(canvas.getByRole("button", { name: "Go to the room" }));
    await expect(args.onStart).toHaveBeenCalledOnce();
  },
};

/** On a short phone the button stays on screen: pinned to the bottom, not under the fold. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: "560px", overflow: "auto" }} data-testid="phone">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const phone = canvas.getByTestId("phone");
    const button = canvas.getByRole("button", { name: "Go to the room" });
    const inView = () => button.getBoundingClientRect().bottom <= phone.getBoundingClientRect().bottom;
    await expect(inView()).toBe(true);
    phone.scrollTop = 0;
    await expect(inView()).toBe(true);
  },
};
