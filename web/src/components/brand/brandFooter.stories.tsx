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
    const donate = canvas.getByRole("link", { name: "donating to Ukrainian citizens" });
    await expect(donate).toHaveAttribute("href", "https://u24.gov.ua/");
    await expect(donate).toHaveAttribute("target", "_blank");
    await expect(donate).toHaveAttribute("rel", "noopener noreferrer");
    for (const flag of ["Dutch flag", "EU flag"]) {
      await expect(canvas.getByRole("img", { name: flag })).toBeVisible();
    }
    // A nod to the brand above the small print: a doodled line with stars in the hat's colours, only decoration.
    const divider = canvas.getByRole("contentinfo").firstElementChild!;
    await expect(divider).toHaveAttribute("aria-hidden", "true");
    await expect(divider).toBeVisible();
    await expect(divider.querySelectorAll("svg")).toHaveLength(5);
  },
};

/** At The End, where the donate card already asks: the maker and where it runs, without the ask. */
export const WithoutTheAsk: Story = {
  args: { support: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Joris van der Burgh" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Help out on GitHub" })).toBeNull();
    await expect(canvas.queryByRole("link", { name: "donating to Ukrainian citizens" })).toBeNull();
  },
};
