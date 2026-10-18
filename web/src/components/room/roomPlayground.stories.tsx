import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RoomPlayground } from "./RoomPlayground.component";
import { playersFixture, wordsFixture } from "./_fixtures/players.fixture";

const meta = {
  title: "Room/RoomPlayground",
  component: RoomPlayground,
  parameters: { layout: "fullscreen" },
  args: { players: playersFixture, youId: "juno", words: wordsFixture },
} satisfies Meta<typeof RoomPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnDevices: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { name: "Ready to doodle?" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: /Own devices/ })).toBeChecked();
    await expect(canvas.getByText("1:00")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "End turn" })).toBeNull();
    await expect(canvas.getByRole("region", { name: "Drawing tools" })).toHaveFocus();

    // Pip is simulated: after one stroke the turn passes to you.
    await expect(
      await canvas.findByRole("img", { name: "Shared drawing. Your turn to draw." }, { timeout: 6_000 }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "End turn" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Mo is drawing." })).toBeVisible();
  },
};

export const OneDevice: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("One device"));
    await userEvent.click(canvas.getByRole("button", { name: "Start round" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Pip is drawing." })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Pip\W+Drawing now/ })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "End turn" }));
    await expect(canvas.getByRole("img", { name: "Shared drawing. Juno is drawing." })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Mo\W+Up next/ })).toBeVisible();
  },
};

export const SpotlightWithEscape: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Spotlight Mo/ }));
    await expect(canvas.getByText("Mo’s lines")).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByText("Mo’s lines")).toBeNull();
    await expect(canvas.getByRole("button", { name: /Spotlight Mo/ })).toHaveAttribute("aria-pressed", "false");
  },
};
