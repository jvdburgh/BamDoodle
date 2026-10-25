import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { RoomGuess } from "./RoomGuess.component";

const meta = {
  title: "Room/RoomGuess",
  component: RoomGuess,
  args: { bamboozlerName: "Mo", category: "Animals", yours: false, msLeft: 14_000, onGuess: fn() },
} satisfies Meta<typeof RoomGuess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo gets one guess at the word…")).toBeVisible();
    await expect(canvas.queryByRole("textbox")).toBeNull();
  },
};

/** The category as a hint, and only what the server's matching forgives (`server/src/room/guess.rs`). */
export const YourGuess: Story = {
  args: { yours: true },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("Your one guess at the word (Animals).")).toBeVisible();
    await expect(canvas.getByText("No worries, we’re not too picky about spelling.")).toBeVisible();
    const field = canvas.getByLabelText("Your guess");
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.type(field, "giraffe{Enter}");
    await expect(args.onGuess).toHaveBeenCalledWith("giraffe");
  },
};
