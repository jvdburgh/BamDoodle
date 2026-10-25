import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { LobbyStart } from "./LobbyStart.component";

const meta = {
  title: "Lobby/LobbyStart",
  component: LobbyStart,
  parameters: { layout: "fullscreen" },
  args: { onEnter: fn(), onCreate: fn() },
} satisfies Meta<typeof LobbyStart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JoinFirst: Story = {
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole("button");
    await expect(buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
      "Music",
      "Sound",
      "Join a room",
      "Create a room",
    ]);
    await expect(canvas.getByRole("heading", { name: "How to play" })).toBeInTheDocument();
  },
};

export const CreateARoom: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create a room" }));
    await expect(args.onCreate).toHaveBeenCalled();
    await expect(args.onEnter).not.toHaveBeenCalled();
  },
};

export const GettingTheRoomReady: Story = {
  args: { busy: true, problem: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Just a sec…" })).toBeDisabled();
  },
};

export const CantCreate: Story = {
  args: { problem: "Couldn’t reach the game. Check your connection and try again.", focusCreate: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Couldn’t reach the game.");
    await expect(canvas.getByRole("button", { name: "Create a room" })).toHaveFocus();
  },
};

export const BackFromTheSetup: Story = {
  args: { focusCreate: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Create a room" })).toHaveFocus();
  },
};

/** After setting the room up: now your name, and Back returns to the setup. */
export const NameYourself: Story = {
  args: { step: "create", onBack: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "And you are?" })).toBeVisible();
    const name = canvas.getByLabelText("Your name");
    await expect(name).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Create room" })).toBeDisabled();
    await userEvent.type(name, "  Joris ");
    await userEvent.click(canvas.getByRole("button", { name: "Create room" }));
    await expect(args.onEnter).toHaveBeenCalledWith({ kind: "create", name: "Joris" });
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(args.onBack).toHaveBeenCalled();
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

export const SharedLink: Story = {
  args: { defaultCode: "BKZW" },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Room code")).toHaveValue("BKZW");
    await expect(canvas.getByLabelText("Your name")).toHaveFocus();
  },
};

export const TurnedAway: Story = {
  args: { defaultCode: "BKZW", defaultName: "Pip", problem: "That room is full." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("That room is full.");
    await expect(canvas.getByRole("button", { name: "Join" })).toBeEnabled();
  },
};

export const Waiting: Story = {
  args: { defaultCode: "BKZW", defaultName: "Pip", busy: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Just a sec…" })).toBeDisabled();
  },
};

export const Back: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Join a room" }));
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(canvas.getByRole("button", { name: "Join a room" })).toHaveFocus();
  },
};
