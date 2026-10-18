import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { RoomSuspectButton } from "./RoomSuspectButton.component";

const meta = {
  title: "Room/RoomSuspectButton",
  component: RoomSuspectButton,
  args: { name: "Juno", suspected: false, onToggle: () => {} },
  render: function Render(args) {
    const [suspected, setSuspected] = useState(args.suspected);
    return (
      <div className="relative flex h-32 w-32 justify-end rounded-[12px_16px_14px_10px] bg-night-deep/70 p-1.5">
        <RoomSuspectButton {...args} suspected={suspected} onToggle={() => setSuspected(!suspected)} />
      </div>
    );
  },
} satisfies Meta<typeof RoomSuspectButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Toggles: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Mark Juno as suspicious" });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAccessibleName("Mark Juno as suspicious");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "false");
  },
};

export const Suspected: Story = {
  args: { suspected: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Mark Juno as suspicious" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const LabelAfterATap: Story = {
  play: async ({ canvas }) => {
    const label = canvas.getByText("Mark as suspicious");
    await expect(label).toHaveClass("opacity-0");
    await userEvent.click(canvas.getByRole("button", { name: "Mark Juno as suspicious" }));
    await expect(canvas.getByText("Marked as suspicious")).toHaveClass("opacity-100");
    await waitFor(() => expect(canvas.getByText("Marked as suspicious")).toHaveClass("opacity-0"), { timeout: 3000 });
  },
};
