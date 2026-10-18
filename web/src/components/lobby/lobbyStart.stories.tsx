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

export const JoinFirst: Story = {
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole("button");
    await expect(buttons.map((button) => button.textContent)).toEqual(["Join a room", "Create a room"]);
  },
};

export const CreateARoom: Story = {
  args: { expectedPlayers: 4 },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create a room" }));
    await expect(canvas.getByRole("heading", { name: "Set up your room" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: /One stroke each/ })).toHaveFocus();
    await expect(canvas.getByRole("group", { name: "Laps" })).toBeVisible();
    await expect(canvas.getByText("2 min")).toBeVisible();

    await userEvent.click(canvas.getByText("Timed turns"));
    await expect(canvas.queryByRole("group", { name: "Laps" })).toBeNull();
    await userEvent.click(canvas.getByText("30 s"));
    await userEvent.click(canvas.getByText("10"));
    await userEvent.click(canvas.getByText("Own colours"));
    await userEvent.click(canvas.getByText("Nederlands"));
    await userEvent.click(canvas.getByLabelText("Adults pack (18+)"));
    await expect(canvas.getByText("5 min")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));

    const name = canvas.getByLabelText("Your name");
    await expect(name).toHaveFocus();
    const create = canvas.getByRole("button", { name: "Create room" });
    await expect(create).toBeDisabled();
    await userEvent.type(name, "  Joris ");
    await userEvent.click(create);
    await expect(args.onEnter).toHaveBeenCalledWith({
      kind: "create",
      name: "Joris",
      mode: "timed",
      laps: 3,
      turnSeconds: 30,
      rounds: 10,
      attribution: "shades",
      language: "nl",
      adults: true,
    });
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
