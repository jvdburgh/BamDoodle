import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomSpotlightChip } from "./RoomSpotlightChip.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomSpotlightChip",
  component: RoomSpotlightChip,
  args: {
    player: playersFixture[0] ?? { id: 1, name: "Pip", avatarSeed: 12, avatar: [], connected: true },
  },
} satisfies Meta<typeof RoomSpotlightChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spotlit: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Pip’s lines")).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const Yours: Story = {
  args: { you: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Your lines")).toBeVisible();
  },
};
