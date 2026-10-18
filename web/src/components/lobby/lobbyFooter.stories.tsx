import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LobbyFooter } from "./LobbyFooter.component";

const meta = {
  title: "Lobby/LobbyFooter",
  component: LobbyFooter,
} satisfies Meta<typeof LobbyFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const github = canvas.getByRole("link", { name: "Help make it on GitHub" });
    await expect(github).toHaveAttribute("href", "https://github.com/jvdburgh/BamDoodle");
    const donate = canvas.getByRole("link", { name: "Donate to United24" });
    await expect(donate).toHaveAttribute("href", "https://u24.gov.ua/");
    await expect(donate).toHaveAttribute("target", "_blank");
    await expect(donate).toHaveAttribute("rel", "noopener noreferrer");
  },
};
