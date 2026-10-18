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

export const MusicOffByDefaultOnAPhone: Story = {
  args: { channel: "music" },
  beforeEach: () => {
    SoundPlayer.clearMusicChoice();
    SoundPlayer.setMusicWanted(false, false);
    return () => SoundPlayer.clearMusicChoice();
  },
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "Music" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("title", "Music is off");

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(window.localStorage.getItem("bamdoodle.music")).toBe("1");
    await expect(SoundPlayer.isMuted()).toBe(false);
  },
};

export const MusicOnByDefaultOnTheHostScreen: Story = {
  args: { channel: "music" },
  beforeEach: () => {
    SoundPlayer.clearMusicChoice();
    SoundPlayer.setMusicWanted(false, true);
    return () => {
      SoundPlayer.clearMusicChoice();
      SoundPlayer.setMusicWanted(false, false);
    };
  },
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "Music" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("title", "Music is on");

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(window.localStorage.getItem("bamdoodle.music")).toBe("0");
  },
};
