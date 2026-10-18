import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { AvatarUtils } from "@/components/avatar/_utils/avatar.utils";
import { RoomSuspectButton } from "./RoomSuspectButton.component";

const meta = {
  title: "Room/RoomSuspectButton",
  component: RoomSuspectButton,
  args: { name: "Juno", avatar: AvatarUtils.face(7), suspected: false, onToggle: () => {}, className: "size-8" },
  render: function Render(args) {
    const [suspected, setSuspected] = useState(args.suspected);
    return (
      <div className="relative flex h-32 w-36 items-start gap-2 rounded-[12px_16px_14px_10px] bg-night-deep/70 p-1.5 pt-4">
        <RoomSuspectButton {...args} suspected={suspected} onToggle={() => setSuspected(!suspected)} />
        <span className="font-display">{args.name}</span>
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
    const hat = button.querySelector("img")!;
    const opacity = () => Number(getComputedStyle(hat).opacity);
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(opacity()).toBe(1));
    await expect(button).toHaveAccessibleName("Mark Juno as suspicious");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    // Back to the faint preview (it still has focus), no longer worn.
    await waitFor(() => expect(opacity()).toBeLessThan(0.7));
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
