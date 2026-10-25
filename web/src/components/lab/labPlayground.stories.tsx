import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LabPlayground } from "./LabPlayground.component";
import { setupFixture, wordsFixture } from "./_fixtures/lab.fixture";
import { playersFixture, roomCodeFixture } from "@/components/room/_fixtures/players.fixture";

const meta = {
  title: "Lab/LabPlayground",
  component: LabPlayground,
  parameters: { layout: "fullscreen" },
  args: {
    players: playersFixture.slice(0, 4),
    youId: 2,
    words: wordsFixture,
    roomCode: roomCodeFixture,
    view: "player",
    role: "artist",
    setup: setupFixture,
  },
} satisfies Meta<typeof LabPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  // One stroke each, so a simulated player's turn passes after one stroke.
  args: { setup: { ...setupFixture, mode: "oneStroke" } },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("bamdoodle.io")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Drawing tools" })).toHaveFocus();

    // Pip is simulated: after one stroke the turn passes to you, and your one stroke passes it on to Mo.
    const board = (await canvas.findByRole(
      "img",
      { name: "Shared drawing. Your turn to draw." },
      { timeout: 6_000 },
    )) as HTMLCanvasElement;
    const box = board.getBoundingClientRect();
    const at = (x: number): PointerEventInit => ({
      clientX: box.left + x * box.width,
      clientY: box.top + box.height / 2,
      pointerId: 1,
      pointerType: "mouse",
      pressure: 0.5,
      button: 0,
      buttons: 1,
      bubbles: true,
    });
    board.dispatchEvent(new PointerEvent("pointerdown", at(0.2)));
    board.dispatchEvent(new PointerEvent("pointermove", at(0.5)));
    board.dispatchEvent(new PointerEvent("pointerup", at(0.6)));
    await expect(await canvas.findByRole("img", { name: "Shared drawing. Mo is drawing." })).toBeVisible();
  },
};

export const Bamboozler: Story = {
  args: { role: "bamboozler" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByText("You’re the bamboozler")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
  },
};

export const PhoneAndHost: Story = {
  args: { view: "both", setup: { ...setupFixture, attribution: "shades" }, players: playersFixture },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("region", { name: "Juno’s phone" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Host screen" })).toBeVisible();
    // Only the phone has the host's button; the host screen points at it.
    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getAllByText("Giraffe")).toHaveLength(1);
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
