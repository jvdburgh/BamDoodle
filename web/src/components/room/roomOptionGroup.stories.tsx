import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomOptionGroup } from "./RoomOptionGroup.component";

const meta = {
  title: "Room/RoomOptionGroup",
  component: RoomOptionGroup,
  decorators: [
    (Story) => (
      <div className="w-[28rem] rounded-2xl bg-night p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    legend: "Turns",
    name: "turn-mode",
    options: [
      { value: "classic", name: "Classic", description: "One stroke per turn, 8 seconds to make it" },
      { value: "timed", name: "Timed", description: "10 seconds of free drawing per turn" },
    ],
    value: "classic",
    onChange: fn(),
  },
} satisfies Meta<typeof RoomOptionGroup<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pick: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole("group", { name: "Turns" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: /Classic/ })).toBeChecked();
    await userEvent.click(canvas.getByText("Timed"));
    await expect(args.onChange).toHaveBeenCalledWith("timed");
  },
};
