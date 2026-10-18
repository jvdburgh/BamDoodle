import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { LobbyStart } from "./LobbyStart.component";

const meta = {
  title: "Lobby/LobbyStart",
  component: LobbyStart,
  parameters: { layout: "fullscreen" },
  args: { onEnter: fn() },
} satisfies Meta<typeof LobbyStart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CreateARoom: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create a room" }));
    await expect(canvas.getByLabelText("Your name")).toHaveFocus();
    const create = canvas.getByRole("button", { name: "Create room" });
    await expect(create).toBeDisabled();

    await userEvent.type(canvas.getByLabelText("Your name"), "  Joris ");
    await userEvent.click(canvas.getByText("Timed"));
    await userEvent.click(create);
    await expect(args.onEnter).toHaveBeenCalledWith({ kind: "create", name: "Joris", mode: "timed" });
  },
};

export const JoinARoom: Story = {
  args: { defaultName: "Pip" },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Join a room" }));
    const code = canvas.getByLabelText("Room code");
    await expect(code).toHaveFocus();
    await userEvent.type(code, "bk-zw9a");
    await expect(code).toHaveValue("BKZW");

    await userEvent.click(canvas.getByRole("button", { name: "Join" }));
    await expect(args.onEnter).toHaveBeenCalledWith({ kind: "join", name: "Pip", code: "BKZW" });
  },
};

export const Back: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Join a room" }));
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(canvas.getByRole("button", { name: "Join a room" })).toHaveFocus();
  },
};
