import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LabPhoneFrame } from "./LabPhoneFrame.component";

const meta = {
  title: "Lab/LabPhoneFrame",
  component: LabPhoneFrame,
  args: {
    label: "Juno’s phone",
    children: <p className="p-6 font-display text-3xl">Who’s sketchy?</p>,
  },
} satisfies Meta<typeof LabPhoneFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const phone = canvas.getByRole("region", { name: "Juno’s phone" });
    await expect(phone).toBeVisible();
    await expect(canvas.getByText("Who’s sketchy?")).toBeVisible();
  },
};
