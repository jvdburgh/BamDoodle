import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandFooter } from "./BrandFooter.component";

const meta = {
  title: "Brand/BrandFooter",
  component: BrandFooter,
} satisfies Meta<typeof BrandFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Joris van der Burgh" })).toHaveAttribute(
      "href",
      "https://github.com/jvdburgh",
    );
    await expect(canvas.getByRole("link", { name: "Help out on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/jvdburgh/BamDoodle",
    );
    const donate = canvas.getByRole("link", { name: "donate to our friends in Ukraine" });
    await expect(donate).toHaveAttribute("href", "https://u24.gov.ua/");
    await expect(donate).toHaveAttribute("target", "_blank");
    await expect(donate).toHaveAttribute("rel", "noopener noreferrer");
    for (const flag of ["Dutch flag", "EU flag"]) {
      await expect(canvas.getByRole("img", { name: flag })).toBeVisible();
    }
  },
};
