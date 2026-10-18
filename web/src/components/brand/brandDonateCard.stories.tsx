import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandDonateCard } from "./BrandDonateCard.component";

const meta = {
  title: "Brand/BrandDonateCard",
  component: BrandDonateCard,
} satisfies Meta<typeof BrandDonateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("complementary", { name: "Did you enjoy the game?" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Donate through United24" })).toHaveAttribute(
      "href",
      "https://u24.gov.ua/",
    );
    await expect(canvas.getByRole("link", { name: "help out on GitHub" })).toBeInTheDocument();
  },
};
