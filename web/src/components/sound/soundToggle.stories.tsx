import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { SoundToggle } from "./SoundToggle.component";
import { SoundPlayer } from "./_utils/soundPlayer.utils";

const meta = {
  title: "Sound/SoundToggle",
  component: SoundToggle,
  beforeEach: () => {
    SoundPlayer.setMuted(false);
    return () => SoundPlayer.setMuted(false);
  },
} satisfies Meta<typeof SoundToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MuteAndUnmute: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "Sound" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(SoundPlayer.isMuted()).toBe(true);
    await expect(window.localStorage.getItem("bamdoodle.muted")).toBe("1");

    await userEvent.click(toggle);
    await expect(SoundPlayer.isMuted()).toBe(false);
  },
};

export const MusicOnAndOff: Story = {
  args: { channel: "music" },
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "Music" });
    const before = SoundPlayer.isMusicOn();
    await expect(toggle).toHaveAttribute("aria-pressed", String(before));

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", String(!before));
    await expect(window.localStorage.getItem("bamdoodle.music")).toBe(before ? "0" : "1");
    await expect(SoundPlayer.isMuted()).toBe(false);

    await userEvent.click(toggle);
    await expect(SoundPlayer.isMusicOn()).toBe(before);
  },
};
