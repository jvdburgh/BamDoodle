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
    await expect(canvas.getByRole("link", { name: "donate to our friends in Ukraine" })).toHaveAttribute(
      "href",
      "https://u24.gov.ua/",
    );
    await expect(canvas.getByRole("link", { name: "Help out on GitHub" })).toBeInTheDocument();
  },
};
