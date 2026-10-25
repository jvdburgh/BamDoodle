import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandSupportLine } from "./BrandSupportLine.component";

const meta = {
  title: "Brand/BrandSupportLine",
  component: BrandSupportLine,
} satisfies Meta<typeof BrandSupportLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Enjoying BamDoodle\?/)).toBeVisible();
    const donate = canvas.getByRole("link", { name: "donating to Ukrainian citizens" });
    await expect(donate).toHaveAttribute("href", "https://u24.gov.ua/");
    await expect(donate).toHaveAttribute("rel", "noopener noreferrer");
    await expect(canvas.getByRole("link", { name: "Help out on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/jvdburgh/BamDoodle",
    );
  },
};
