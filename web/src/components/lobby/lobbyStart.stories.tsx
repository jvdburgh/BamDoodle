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
    const button = canvas.getByRole("button", { name: "Just a sec…" });
    await expect(button).toBeDisabled();
    // Disabled reads as a quiet navy button with a dashed sun outline, not a faded (muddy) sun one.
    const style = getComputedStyle(button);
    await expect(style.opacity).toBe("1");
    await expect(style.outlineStyle).toBe("dashed");
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

/** After setting the room up: play with your name, or host on this screen; Back returns to the setup. */
export const NameYourself: Story = {
  args: { step: "create", onBack: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "What’s your name?" })).toBeVisible();
    // A form gets the small logo, so the button stays above a phone's keyboard.
    await expect(canvas.queryByRole("heading", { name: "BamDoodle" })).toBeNull();
    await expect(canvas.getByRole("link", { name: /BamDoodle/ })).toBeVisible();
    const name = canvas.getByLabelText("Your name");
    await expect(name).toHaveFocus();
    const play = canvas.getByRole("button", { name: /^Play on this (phone|laptop)$/ });
    await expect(play).toBeDisabled();
    await userEvent.type(name, "  Joris ");
    await userEvent.click(play);
    await expect(args.onEnter).toHaveBeenCalledWith({ kind: "create", name: "Joris" });
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};

/** A TV or laptop everyone can see hosts without playing, under the host's name. */
export const HostOnThisScreen: Story = {
  args: { step: "create" },
  play: async ({ args, canvas, userEvent }) => {
    // Hosting needs a name too: the players read "Joris starts the round", not just "the host". Like Play, the
    // button waits for it.
    const host = canvas.getByRole("button", { name: "Host on this screen" });
    await expect(host).toBeDisabled();
    await expect(canvas.getByText(/Show the game on a TV or laptop/)).toBeVisible();
    await userEvent.type(canvas.getByLabelText("Your name"), "Joris");
    await expect(host).toBeEnabled();
    await expect(canvas.queryByRole("alert")).toBeNull();
    await userEvent.click(host);
    await expect(args.onEnter).toHaveBeenCalledWith({ kind: "host", name: "Joris" });
  },
};

export const JoinARoom: Story = {
  args: { defaultName: "Pip" },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Join a room" }));
    const code = canvas.getByLabelText("Room code");
    await expect(code).toHaveFocus();
    await expect(code).toHaveAttribute("placeholder", "e.g. ABCD");
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

/** The problem belongs to the try that failed: Back to the start page, or starting something else, clears it. */
export const BackFromAProblem: Story = {
  args: { defaultCode: "BKZW", defaultName: "Pip", problem: "There’s no room with that code." },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("There’s no room with that code.");
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(canvas.getByRole("button", { name: "Join a room" })).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const SomethingElseAfterAProblem: Story = {
  args: { problem: "Couldn’t reach the game. Check your connection and try again." },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("alert")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Join a room" }));
    await expect(canvas.getByLabelText("Room code")).toHaveFocus();
    await expect(canvas.queryByRole("alert")).toBeNull();
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
