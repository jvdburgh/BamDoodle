import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { RoomGuess } from "./RoomGuess.component";

const meta = {
  title: "Room/RoomGuess",
  component: RoomGuess,
  args: { bamboozlerName: "Mo", yours: false, msLeft: 14_000, onGuess: fn() },
} satisfies Meta<typeof RoomGuess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Mo gets one guess at the word…")).toBeVisible();
    await expect(canvas.queryByRole("textbox")).toBeNull();
  },
};

export const YourGuess: Story = {
  args: { yours: true },
  play: async ({ args, canvas, userEvent }) => {
    const field = canvas.getByLabelText("Your guess");
    await waitFor(() => expect(field).toHaveFocus());
    await userEvent.type(field, "giraffe{Enter}");
    await expect(args.onGuess).toHaveBeenCalledWith("giraffe");
  },
};
