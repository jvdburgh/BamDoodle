import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LobbySetupSketch, type LobbySetupSketchKind } from "./LobbySetupSketch.component";

const all: LobbySetupSketchKind[] = [
  { kind: "oneStroke" },
  { kind: "timed" },
  { kind: "turns", count: 3 },
  { kind: "turns", count: 5 },
  { kind: "seconds", seconds: 20 },
  { kind: "rounds", count: 5 },
  { kind: "words" },
];

const meta = {
  title: "Lobby/LobbySetupSketch",
  component: LobbySetupSketch,
  args: { sketch: { kind: "oneStroke" }, className: "h-24 w-32" },
} satisfies Meta<typeof LobbySetupSketch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneStroke: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg[viewBox="0 0 64 48"]')!;
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
  },
};

export const TalliesFollowTheTurns: Story = {
  args: { sketch: { kind: "turns", count: 4 } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('svg[viewBox="0 0 64 48"] path')).toHaveLength(4);
  },
};

export const Every: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {all.map((sketch) => (
        <LobbySetupSketch
          key={JSON.stringify(sketch)}
          sketch={sketch}
          className="h-20 w-28 rounded-xl bg-night-deep p-2"
        />
      ))}
    </div>
  ),
};
