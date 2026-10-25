import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
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
  args: {
    settings,
    wordCategories: wordCategoriesFixture,
    onChange: fn(),
    onDone: fn(),
    doneLabel: "Next",
    onBack: fn(),
  },
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

const radio = (group: HTMLElement, name: string) => within(group).getByRole("radio", { name });

/** Creating a room: set it up before it exists, then on to your name. */
export const SetUpTheRoom: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Set up your room" })).toBeVisible();
    await expect(canvas.getByText(/You can change all of this between rounds\./)).toBeVisible();
    await expect(canvas.queryByText("Room")).toBeNull();
    // Timed turns first: the default, and what playtesters liked best.
    const mode = canvas.getByRole("group", { name: "Mode" });
    await expect(mode).toHaveAccessibleDescription("How a turn works.");
    await expect(
      within(mode)
        .getAllByRole("radio")
        .map((choice) => choice.getAttribute("aria-label")),
    ).toEqual(["Timed turns", "One stroke each"]);
    const oneStroke = canvas.getByRole("radio", { name: "One stroke each" });
    await expect(oneStroke).toHaveFocus();
    await expect(oneStroke).toHaveAccessibleDescription("Draw one line, pass it on");
    await expect(canvas.getByRole("radio", { name: "Timed turns" })).toHaveAccessibleDescription(
      "Draw freely until the timer runs out",
    );
    await expect(canvas.getByRole("radio", { name: "English" })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Animals" })).toBeChecked();

    // Numbers on every pill, the unit in the heading.
    const turns = canvas.getByRole("group", { name: "Turns each" });
    await expect(turns).toHaveAccessibleDescription("Each turn is one line. How many turns everyone gets per word.");
    await expect(
      within(turns)
        .getAllByRole("radio")
        .map((choice) => choice.getAttribute("aria-label")),
    ).toEqual(["1", "2", "3", "4", "5"]);
    await expect(radio(turns, "3")).toBeChecked();
    const rounds = canvas.getByRole("group", { name: "Rounds" });
    await expect(rounds).toHaveAccessibleDescription(
      "One round is one word, one drawing and one vote, with a new bamboozler each time.",
    );
    await expect(within(rounds).getByText("About 13 minutes with 5 players")).toBeVisible();
    await expect(canvas.getByText("One stroke · 3 turns each · 5 rounds · English · 2 categories")).toBeVisible();

    await userEvent.click(canvas.getByText("Timed turns"));
    await expect(canvas.queryByRole("group", { name: "Turns each" })).toBeNull();
    const seconds = canvas.getByRole("group", { name: /^Time per turn/ });
    await expect(seconds).toHaveAccessibleDescription("Everyone gets 2 turns per word.");
    await userEvent.click(radio(seconds, "30"));
    await userEvent.click(radio(rounds, "10"));
    await expect(args.onChange).toHaveBeenLastCalledWith({ ...settings, mode: "timed", turnSeconds: 30, rounds: 10 });
    await expect(within(rounds).getByText("About 1 hour with 5 players")).toBeVisible();
    await expect(canvas.getByText("Timed · 30 s · 2 turns each · 10 rounds · English · 2 categories")).toBeVisible();

    await userEvent.click(canvas.getByText("Nederlands"));
    await expect(canvas.getByRole("checkbox", { name: /Dieren/ })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: /Na middernacht/ })).not.toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(canvas.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(canvas.getByText("Efteling"));
    await userEvent.click(canvas.getByText("Na middernacht"));
    await expect(args.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: "nl", categories: ["Efteling", "Na middernacht"] }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await expect(args.onDone).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(args.onBack).toHaveBeenCalled();
  },
};

/** The bar sits at the end of the form, not floating over the categories. */
export const DoneAtTheEnd: Story = {
  play: async ({ canvas }) => {
    const next = canvas.getByRole("button", { name: "Next" });
    await expect(getComputedStyle(next.parentElement!).position).toBe("static");
    const categories = canvas.getByRole("group", { name: /Categories/ });
    await expect(categories.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  },
};

/** From the room between rounds, by the host: every change reaches the room at once. */
export const InTheRoom: Story = {
  args: { roomCode: "BKZW", doneLabel: undefined, onBack: undefined },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Room settings" })).toBeVisible();
    await expect(canvas.getByText("Changes reach everyone right away.")).toBeVisible();
    await expect(canvas.getByText("Room")).toHaveTextContent("Room BKZW");
    await expect(canvas.queryByRole("button", { name: "Back" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Back to the room" }));
    await expect(args.onDone).toHaveBeenCalled();
  },
};
