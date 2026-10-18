import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomTurnCall } from "./RoomTurnCall.component";

const meta = {
  title: "Room/RoomTurnCall",
  component: RoomTurnCall,
  args: { turn: 1, text: "Juno’s turn" },
  render: (args) => (
    <div
      className={`@container/room relative aspect-[4/3] w-96 ${args.surface === "night" ? "bg-night-deep" : "bg-paper"}`}
    >
      <RoomTurnCall {...args} />
    </div>
  ),
} satisfies Meta<typeof RoomTurnCall>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnPaper: Story = {
  play: async ({ canvasElement }) => {
    const call = canvasElement.querySelector("p");
    await expect(call).toHaveTextContent("Juno’s turn");
    await expect(call).toHaveAttribute("aria-hidden", "true");
  },
};

export const OnNight: Story = {
  args: { surface: "night", big: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("p")).toHaveClass("text-white");
  },
};
