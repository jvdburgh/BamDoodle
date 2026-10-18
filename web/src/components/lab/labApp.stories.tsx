import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LabApp } from "./LabApp.component";

const meta = {
  title: "Lab/LabApp",
  component: LabApp,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LabApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SetUpThenName: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Create a room" }));
    await expect(canvas.getByRole("heading", { name: "Set up your room" })).toBeVisible();
    await expect(canvas.getByRole("group", { name: "Colours" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await expect(canvas.getByRole("heading", { name: "And you are?" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(canvas.getByRole("heading", { name: "Set up your room" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await userEvent.click(canvas.getByRole("button", { name: "Create room" }));
    await expect(canvas.getByRole("heading", { name: /Draw your face/ })).toBeVisible();
  },
};
