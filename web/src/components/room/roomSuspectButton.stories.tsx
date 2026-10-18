import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { RoomSuspectButton } from "./RoomSuspectButton.component";

const meta = {
  title: "Room/RoomSuspectButton",
  component: RoomSuspectButton,
  args: { name: "Juno", suspected: false, onToggle: () => {} },
  render: function Render(args) {
    const [suspected, setSuspected] = useState(args.suspected);
    return <RoomSuspectButton {...args} suspected={suspected} onToggle={() => setSuspected(!suspected)} />;
  },
} satisfies Meta<typeof RoomSuspectButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Toggles: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Mark as suspicious (Juno)" });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAccessibleName("Marked as suspicious (Juno)");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "false");
  },
};

export const Suspected: Story = {
  args: { suspected: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Marked as suspicious (Juno)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
