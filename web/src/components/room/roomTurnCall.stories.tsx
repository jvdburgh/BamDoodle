import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomTurnCall } from "./RoomTurnCall.component";

const meta = {
  title: "Room/RoomTurnCall",
  component: RoomTurnCall,
  args: { turn: 1, text: "Juno’s turn" },
  render: (args) => (
    <div className="@container/room relative aspect-[4/3] w-96 bg-paper">
      <RoomTurnCall {...args} />
    </div>
  ),
} satisfies Meta<typeof RoomTurnCall>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  play: async ({ canvasElement }) => {
    const call = canvasElement.querySelector("p");
    await expect(call).toHaveTextContent("Juno’s turn");
    await expect(call).toHaveAttribute("aria-hidden", "true");
  },
};

export const HostScreen: Story = {
  args: { big: true },
  play: async ({ canvasElement }) => {
    // The host's header says whose turn it is: the call stays small and near the top, off the drawing.
    await expect(canvasElement.querySelector("p")).toHaveClass("top-[4%]");
  },
};
