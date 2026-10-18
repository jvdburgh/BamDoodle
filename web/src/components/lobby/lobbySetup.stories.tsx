import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { LobbySetup } from "./LobbySetup.component";
import { wordCategoriesFixture } from "./_fixtures/wordCategories.fixture";
import type { RoomSettings } from "@/protocol/generated/RoomSettings";

const settings: RoomSettings = {
  mode: "oneStroke",
  turnsPerPlayer: 3,
  turnSeconds: 20,
  rounds: 5,
  language: "en",
  categories: ["Animals", "Food"],
};

const meta = {
  title: "Lobby/LobbySetup",
  component: LobbySetup,
  parameters: { layout: "fullscreen" },
  args: { roomCode: "BKZW", settings, wordCategories: wordCategoriesFixture, onChange: fn(), onDone: fn() },
  render: function Render(args) {
    // The server echoes every change back as the room's settings.
    const [current, setCurrent] = useState(args.settings);
    return (
      <LobbySetup
        {...args}
        settings={current}
        onChange={(next) => {
          setCurrent(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof LobbySetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SetUpTheRoom: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Set up your room" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: /One stroke each/ })).toHaveFocus();
    await expect(canvas.getByRole("radio", { name: "3 times" })).toBeChecked();
    await expect(canvas.queryByRole("group", { name: "Colours" })).toBeNull();

    await userEvent.click(canvas.getByText("Timed turns"));
    await expect(canvas.queryByRole("group", { name: "Each player draws" })).toBeNull();
    await userEvent.click(canvas.getByText("30 s"));
    await userEvent.click(canvas.getByRole("radio", { name: "10" }));
    await expect(args.onChange).toHaveBeenLastCalledWith({ ...settings, mode: "timed", turnSeconds: 30, rounds: 10 });

    await userEvent.click(canvas.getByText("Nederlands"));
    await expect(canvas.getByRole("checkbox", { name: /Dieren/ })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: /Na middernacht/ })).not.toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(canvas.getByRole("button", { name: "Go to the room" })).toBeDisabled();
    await userEvent.click(canvas.getByText("Efteling"));
    await userEvent.click(canvas.getByText("Na middernacht"));
    await expect(args.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: "nl", categories: ["Efteling", "Na middernacht"] }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Go to the room" }));
    await expect(args.onDone).toHaveBeenCalled();
  },
};

export const WithColoursInTheLab: Story = {
  args: { attribution: "free", onAttribution: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Own colours"));
    await expect(args.onAttribution).toHaveBeenCalledWith("shades");
  },
};
