import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomWordCard } from "./RoomWordCard.component";

const meta = {
  title: "Room/RoomWordCard",
  component: RoomWordCard,
  args: { category: "Animals", word: "Giraffe", view: "artist" },
} satisfies Meta<typeof RoomWordCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The word with whose it is, on one line of the round banner. */
export const Artist: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Giraffe")).toBeVisible();
    await expect(canvas.getByText("Animals")).toBeVisible();
    await expect(canvas.getByText("everyone’s word")).toBeVisible();
  },
};

/** The bamboozler's line has the same shape as the word's: a big token and a small tag. */
export const Bamboozler: Story = {
  args: { view: "bamboozler", word: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("???")).toHaveClass("text-3xl");
    await expect(canvas.getByText("You’re the bamboozler")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
  },
};

/** Not in the round (joined late): no secret either way. */
export const NotInTheRound: Story = {
  args: { view: "host", word: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Who’s sketchy?")).toBeVisible();
    await expect(canvas.queryByText("Giraffe")).toBeNull();
  },
};
