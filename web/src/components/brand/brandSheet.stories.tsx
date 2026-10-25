import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { BrandSheet } from "./BrandSheet.component";

const meta = {
  title: "Brand/BrandSheet",
  component: BrandSheet,
  args: {
    label: "Who’s sketchy?",
    children: (
      <>
        <p>Time’s up! Who’s sketchy?</p>
        <button type="button" onClick={fn()}>
          Vote for Mo
        </button>
      </>
    ),
  },
} satisfies Meta<typeof BrandSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Without `onClose` (the vote): over everything until it's done, and Esc doesn't close it. */
export const UntilItsDone: Story = {
  play: async ({ canvas, userEvent }) => {
    const sheet = canvas.getByRole("dialog", { name: "Who’s sketchy?" });
    await expect(sheet).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Vote for Mo" })).toHaveFocus();
    await expect(canvas.queryByRole("button", { name: "Close" })).toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect(sheet).toHaveAttribute("open");
    // Browsers let a page refuse Esc (or Android's back) only so often, then close it anyway: it opens again.
    (sheet as HTMLDialogElement).close();
    await waitFor(() => expect(sheet).toHaveAttribute("open"));
  },
};

/** With `onClose` (how to play): a Close button, and Esc closes it too. */
export const Dismissible: Story = {
  args: { label: "How to play", onClose: fn(), children: <p>Draw together.</p> },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    // Esc or Android's back: the browser closes it, and the owner hears about it.
    const sheet = canvas.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    sheet.showModal();
    sheet.close();
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(2));
  },
};
