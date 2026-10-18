import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomWordCard } from "./RoomWordCard.component";

const meta = {
  title: "Room/RoomWordCard",
  component: RoomWordCard,
  args: { category: "Animals", word: "Giraffe" },
} satisfies Meta<typeof RoomWordCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.getByText("The word, from Animals")).toBeVisible();
  },
};
