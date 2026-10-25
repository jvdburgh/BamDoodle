import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { RoomSecretReveal } from "./RoomSecretReveal.component";

const meta = {
  title: "Room/RoomSecretReveal",
  component: RoomSecretReveal,
  parameters: { layout: "fullscreen" },
  args: { category: "Animals", word: "giraffe", showMs: 3_200 },
} satisfies Meta<typeof RoomSecretReveal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An artist: the word, big, and that everyone has it but one. */
export const TheSecretWord: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByTestId("secret-reveal");
    await expect(card).toHaveTextContent("The secret word is");
    await waitFor(() => expect(canvas.getByText("giraffe")).toBeVisible());
    await expect(card).toHaveTextContent("Everyone knows it, except the bamboozler");
  },
};

/** The bamboozler: no word, just the category, and what to do. */
export const YoureTheBamboozler: Story = {
  args: { word: null },
  play: async ({ canvas }) => {
    const card = canvas.getByTestId("secret-reveal");
    await expect(card).toHaveTextContent("You’re the bamboozler!");
    await expect(card).toHaveTextContent("Animals");
    await expect(card).not.toHaveTextContent("giraffe");
  },
};

/** It moves out of the way by itself; the word stays in the header. */
export const GoesAway: Story = {
  args: { showMs: 300 },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.queryByTestId("secret-reveal")).toBeNull(), { timeout: 2_000 });
  },
};
