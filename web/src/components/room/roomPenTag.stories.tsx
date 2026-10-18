import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomPenTag } from "./RoomPenTag.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomPenTag",
  component: RoomPenTag,
  args: { player: playersFixture[2] ?? { id: "mo", name: "Mo", avatarSeed: 23 } },
} satisfies Meta<typeof RoomPenTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreeColours: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo")).toBeVisible();
  },
};

export const WithShade: Story = {
  args: { color: "#7ec42e" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("circle")).toHaveStyle({ fill: "rgb(126, 196, 46)" });
  },
};
