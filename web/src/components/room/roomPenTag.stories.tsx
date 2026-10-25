import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomPenTag } from "./RoomPenTag.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomPenTag",
  component: RoomPenTag,
  args: {
    player: playersFixture[2] ?? { id: 3, name: "Mo", avatarSeed: 23, avatar: [], connected: true, ready: true },
  },
} satisfies Meta<typeof RoomPenTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo")).toBeVisible();
  },
};
