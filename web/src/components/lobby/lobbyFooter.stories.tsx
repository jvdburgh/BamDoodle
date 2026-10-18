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
    await expect(canvas.getByText(/Made by Joris in the Netherlands/)).toBeVisible();
    const github = canvas.getByRole("link", { name: "contribute on GitHub" });
    await expect(github).toHaveAttribute("href", "https://github.com/jvdburgh/BamDoodle");
    const donate = canvas.getByRole("link", { name: "donate to our friends in Ukraine" });
    await expect(donate).toHaveAttribute("href", "https://u24.gov.ua/");
    await expect(donate).toHaveAttribute("target", "_blank");
    await expect(donate).toHaveAttribute("rel", "noopener noreferrer");
  },
};
