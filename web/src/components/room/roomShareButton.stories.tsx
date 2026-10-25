import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { RoomShareButton } from "./RoomShareButton.component";

/** Swaps one of the browser's sharing features for a spy (or takes it away) for one story. */
function stub<K extends "share" | "clipboard">(key: K, value: Navigator[K] | undefined) {
  const own = Object.getOwnPropertyDescriptor(navigator, key);
  Object.defineProperty(navigator, key, { value, configurable: true });
  return () => {
    if (own) Object.defineProperty(navigator, key, own);
    else delete (navigator as Partial<Navigator>)[key];
  };
}

/** The old way of copying (a selection and `execCommand`), for a page without the Clipboard API. */
function stubCopyCommand(copies: boolean) {
  const copy = fn((_command: string) => copies);
  Object.defineProperty(document, "execCommand", { value: copy, configurable: true });
  return {
    copy,
    restore: () => delete (document as Partial<Document>).execCommand,
  };
}

const writeText = fn(async (_text: string) => {});
const share = fn(async (_data?: ShareData) => {});

const meta = {
  title: "Room/RoomShareButton",
  component: RoomShareButton,
  decorators: [
    (Story) => (
      <div className="w-80 bg-night p-4">
        <Story />
      </div>
    ),
  ],
  args: { roomCode: "BKZW" },
} satisfies Meta<typeof RoomShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The link is there to read out, and a tap puts it on the clipboard (`https://bamdoodle.io/BKZW`) and says so. */
export const CopiesTheLink: Story = {
  beforeEach: () => {
    writeText.mockClear();
    return stub("clipboard", { writeText } as unknown as Clipboard);
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(`${location.host}/BKZW`)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }));
    await expect(writeText).toHaveBeenCalledWith(`${location.origin}/BKZW`);
    await expect(canvas.getByRole("status")).toHaveTextContent("Link copied");
  },
};

/** A phone with a share sheet copies too: the share sheet is never what a tap opens. */
export const CopiesOnAPhoneToo: Story = {
  beforeEach: () => {
    share.mockClear();
    writeText.mockClear();
    const unshare = stub("share", share);
    const unclip = stub("clipboard", { writeText } as unknown as Clipboard);
    return () => {
      unshare();
      unclip();
    };
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }));
    await expect(writeText).toHaveBeenCalledWith(`${location.origin}/BKZW`);
    await expect(share).not.toHaveBeenCalled();
    await expect(canvas.getByRole("status")).toHaveTextContent("Link copied");
  },
};

/** No Clipboard API (a page that isn't https, like the dev server on a phone): the link is selected and copied. */
export const NoClipboard: Story = {
  beforeEach: () => {
    const unclip = stub("clipboard", undefined);
    const command = stubCopyCommand(true);
    return () => {
      unclip();
      command.restore();
    };
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }));
    await expect(document.getSelection()?.toString()).toBe(`${location.host}/BKZW`);
    await expect(canvas.getByRole("status")).toHaveTextContent("Link copied");
  },
};

/** Nothing copies at all: the link stays selected, and it says how to copy it, so nothing just fails silently. */
export const NothingCopies: Story = {
  beforeEach: () => {
    const unclip = stub("clipboard", undefined);
    const command = stubCopyCommand(false);
    return () => {
      unclip();
      command.restore();
    };
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Copy link" }));
    await expect(document.getSelection()?.toString()).toBe(`${location.host}/BKZW`);
    await expect(canvas.getByRole("status")).toHaveTextContent("Couldn’t copy it: copy the link above by hand");
  },
};
