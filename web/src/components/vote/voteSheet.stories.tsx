import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { VoteSheet } from "./VoteSheet.component";

const meta = {
  title: "Vote/VoteSheet",
  component: VoteSheet,
  args: {
    children: (
      <>
        <p>Time’s up! Who’s sketchy?</p>
        <button type="button" onClick={fn()}>
          Vote for Mo
        </button>
      </>
    ),
  },
} satisfies Meta<typeof VoteSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Over everything until the vote ends: the page behind can't be reached, and Esc doesn't close it. */
export const OverEverything: Story = {
  play: async ({ canvas, userEvent }) => {
    const sheet = canvas.getByRole("dialog", { name: "Who’s sketchy?" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute("open");
    await expect(canvas.getByRole("button", { name: "Vote for Mo" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(sheet).toHaveAttribute("open");
  },
};
