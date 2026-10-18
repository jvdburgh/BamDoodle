import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomSpotlightChip } from "./RoomSpotlightChip.component";
import { playersFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomSpotlightChip",
  component: RoomSpotlightChip,
  args: { player: playersFixture[0] ?? { id: "pip", name: "Pip", avatarSeed: 12, avatar: [] }, onClear: fn() },
} satisfies Meta<typeof RoomSpotlightChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pinned: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Pip’s lines")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /Show all/ }));
    await expect(args.onClear).toHaveBeenCalled();
  },
};

export const PeekAtYours: Story = {
  args: { you: true, onClear: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Your lines")).toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
