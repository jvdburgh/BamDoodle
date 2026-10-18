import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LabPlayground } from "./LabPlayground.component";
import { playersFixture, roomCodeFixture, wordsFixture } from "@/components/room/_fixtures/players.fixture";

const meta = {
  title: "Lab/LabPlayground",
  component: LabPlayground,
  parameters: { layout: "fullscreen" },
  args: {
    players: playersFixture.slice(0, 4),
    youId: "juno",
    words: wordsFixture,
    roomCode: roomCodeFixture,
    view: "player",
    role: "artist",
    mode: "classic",
    attribution: "free",
    roundSeconds: 60,
    seats: "simulated",
  },
} satisfies Meta<typeof LabPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
    await expect(canvas.getByText("Giraffe")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "End turn" })).toBeNull();
    await expect(canvas.getByRole("region", { name: "Drawing tools" })).toHaveFocus();

    // Pip is simulated: after one stroke the turn passes to you.
    await expect(
      await canvas.findByRole("img", { name: "Shared drawing. Your turn to draw." }, { timeout: 6_000 }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "End turn" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Mo is drawing." })).toBeVisible();
  },
};

export const Bamboozler: Story = {
  args: { role: "bamboozler" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("You’re the bamboozler")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
  },
};

export const OneDevice: Story = {
  args: { seats: "shared" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "End turn" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Juno is drawing." })).toBeVisible();
  },
};

export const PhoneAndHost: Story = {
  args: { view: "both", attribution: "shades", players: playersFixture },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("region", { name: "Juno’s phone" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Host screen" })).toBeVisible();
    await expect(canvas.getAllByText("Giraffe")).toHaveLength(1);

    await userEvent.click(canvas.getAllByRole("button", { name: "Start round" })[0] as HTMLElement);
    await expect(canvas.getAllByRole("img", { name: "Shared drawing. Pip is drawing." })).toHaveLength(2);
  },
};

export const SpotlightWithEscape: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Spotlight Mo/ }));
    await expect(canvas.getByText("Mo’s lines")).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByText("Mo’s lines")).toBeNull();
    await expect(canvas.getByRole("button", { name: /Spotlight Mo/ })).toHaveAttribute("aria-pressed", "false");
  },
};
