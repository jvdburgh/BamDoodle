import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { wordCategoriesFixture } from "@/components/room/_fixtures/words.fixture";
import { LobbyStart } from "./LobbyStart.component";

const meta = {
  title: "Lobby/LobbyStart",
  component: LobbyStart,
  parameters: { layout: "fullscreen" },
  args: { onEnter: fn(), wordCategories: wordCategoriesFixture },
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
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create a room" }));
    await expect(canvas.getByRole("heading", { name: "Set up your room" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: /One stroke each/ })).toHaveFocus();
    await expect(canvas.getByRole("group", { name: "Each player draws" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "3 times" })).toBeChecked();
    await expect(canvas.queryByText(/min a round/)).toBeNull();

    await userEvent.click(canvas.getByText("Timed turns"));
    await expect(canvas.queryByRole("group", { name: "Each player draws" })).toBeNull();
    await userEvent.click(canvas.getByText("30 s"));
    await userEvent.click(canvas.getByRole("radio", { name: "10" }));
    await userEvent.click(canvas.getByText("Own colours"));

    await userEvent.click(canvas.getByText("Nederlands"));
    await expect(canvas.getByRole("checkbox", { name: /Dieren/ })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: /Na middernacht/ })).not.toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(canvas.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(canvas.getByText("Efteling"));
    await userEvent.click(canvas.getByText("Na middernacht"));
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));

    const name = canvas.getByLabelText("Your name");
    await expect(name).toHaveFocus();
    await userEvent.type(name, "  Joris ");
    await userEvent.click(canvas.getByRole("button", { name: "Create room" }));
    await expect(args.onEnter).toHaveBeenCalledWith({
      kind: "create",
      name: "Joris",
      mode: "timed",
      turnsPerPlayer: 3,
      turnSeconds: 30,
      rounds: 10,
      attribution: "shades",
      language: "nl",
      categories: ["Efteling", "Na middernacht"],
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
