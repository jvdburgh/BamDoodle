import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { CanvasPalette } from "./CanvasPalette.component";
import { CanvasTools } from "./_utils/canvasTools.utils";

const meta = {
  title: "Canvas/CanvasPalette",
  component: CanvasPalette,
  decorators: [
    (Story) => (
      <div className="w-80 rounded-2xl bg-night-deep p-4">
        <Story />
      </div>
    ),
  ],
  args: { colours: CanvasTools.colours, value: "#000000", onChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <CanvasPalette
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof CanvasPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryColour: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getAllByRole("radio")).toHaveLength(CanvasTools.colours.length);
    await expect(canvas.getByRole("radio", { name: "Black" })).toBeChecked();

    await userEvent.click(canvas.getByRole("radio", { name: "Berry" }));
    await expect(args.onChange).toHaveBeenCalledWith("#f13866");
    await expect(canvas.getByRole("radio", { name: "Berry" })).toBeChecked();
  },
};

export const Keyboard: Story = {
  play: async ({ args, canvas, userEvent }) => {
    canvas.getByRole("radio", { name: "Black" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenCalledWith("#080357");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    for (const radio of canvas.getAllByRole("radio")) await expect(radio).toBeDisabled();
  },
};

/** In a narrow spot like a phone's bottom bar: one row that scrolls sideways and fades out on the right. */
export const OneRowWhenNarrow: Story = {
  args: { rowWhenNarrow: true },
  play: async ({ canvas }) => {
    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(CanvasTools.colours.length);
    const tops = new Set(radios.map((radio) => Math.round(radio.closest("label")!.getBoundingClientRect().top)));
    await expect(tops.size).toBe(1);
    const row = radios[0]!.closest("label")!.parentElement!;
    await expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    await expect(getComputedStyle(row).maskImage).toContain("linear-gradient");
  },
};
