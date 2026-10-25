import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LobbyHowToPlay } from "./LobbyHowToPlay.component";

const meta = {
  title: "Lobby/LobbyHowToPlay",
  component: LobbyHowToPlay,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LobbyHowToPlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("heading", { name: "How to play", level: 2 })).toBeVisible();
    const steps = [...canvasElement.querySelectorAll("ol > li h3")];
    await expect(steps.map((step) => step.textContent)).toEqual([
      "Draw together",
      "One of you bluffs",
      "Spot the bamboozler",
    ]);
    await expect(canvas.getByRole("heading", { name: "Play a few rounds" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Free, on any device" })).toBeVisible();
  },
};
