import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BrandTagline } from "./BrandTagline.component";

const meta = {
  title: "Brand/BrandTagline",
  component: BrandTagline,
} satisfies Meta<typeof BrandTagline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("p")).toHaveTextContent("Draw • Guess • Deceive");
  },
};
