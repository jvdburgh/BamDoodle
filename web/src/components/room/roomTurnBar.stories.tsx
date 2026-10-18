import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomTurnBar } from "./RoomTurnBar.component";

const meta = {
  title: "Room/RoomTurnBar",
  component: RoomTurnBar,
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: { title: "Juno’s turn", mode: "classic", msLeft: 5_300, msTotal: 8_000 },
} satisfies Meta<typeof RoomTurnBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Classic: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Juno’s turn")).toBeVisible();
    await expect(canvas.getByRole("progressbar", { name: "Juno’s turn: time left" })).toHaveAttribute(
      "aria-valuenow",
      "6",
    );
    await expect(canvas.getByText("One stroke, then pass it on")).toBeVisible();
  },
};

export const TimedAlmostOver: Story = {
  args: { title: "Your turn", mode: "timed", msLeft: 2_100, msTotal: 10_000 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Your turn")).toBeVisible();
    await expect(canvas.getByText("3s")).toBeVisible();
    await expect(canvas.getByText("Draw as much as you like")).toBeVisible();
  },
};

export const Watching: Story = {
  args: { hint: "Watch what they draw" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Watch what they draw")).toBeVisible();
    await expect(canvas.queryByText("One stroke, then pass it on")).toBeNull();
  },
};
