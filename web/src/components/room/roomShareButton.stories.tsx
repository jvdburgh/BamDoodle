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

/** No share sheet (Firefox on a laptop): the address goes on the clipboard, and it says so. */
export const CopiesTheLink: Story = {
  beforeEach: () => {
    writeText.mockClear();
    const unshare = stub("share", undefined);
    const unclip = stub("clipboard", { writeText } as unknown as Clipboard);
    return () => {
      unshare();
      unclip();
    };
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share link" }));
    await expect(writeText).toHaveBeenCalledWith(`${location.host}/BKZW`);
    await expect(canvas.getByRole("status")).toHaveTextContent("Link copied");
  },
};

/** On a phone: the phone's own share sheet with the room's address, nothing copied. */
export const SharesFromThePhone: Story = {
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
    await userEvent.click(canvas.getByRole("button", { name: "Share link" }));
    await expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `${location.origin}/BKZW` }));
    await expect(writeText).not.toHaveBeenCalled();
    await expect(canvas.queryByText("Link copied")).toBeNull();
  },
};
