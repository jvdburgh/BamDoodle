import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { LabPanel } from "./LabPanel.component";
import { LabSettingsUtils } from "./_utils/labSettings.utils";

const meta = {
  title: "Lab/LabPanel",
  component: LabPanel,
  parameters: { layout: "fullscreen" },
  args: { settings: LabSettingsUtils.defaults, onChange: fn(), onReset: fn() },
  render: function Render(args) {
    const [settings, setSettings] = useState(args.settings);
    return (
      <div className="h-[44rem]">
        <LabPanel
          {...args}
          settings={settings}
          onChange={(patch) => {
            setSettings((current) => ({ ...current, ...patch }));
            args.onChange(patch);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof LabPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenAndSwitch: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", { name: "Lab" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await expect(canvas.getByRole("region", { name: "Lab" })).toBeVisible();

    await userEvent.click(canvas.getByText("Shades per player"));
    await expect(args.onChange).toHaveBeenLastCalledWith({ attribution: "shades" });
    await expect(canvas.getByRole("radio", { name: "Shades per player" })).toBeChecked();

    await userEvent.click(canvas.getByText("Both"));
    await expect(args.onChange).toHaveBeenLastCalledWith({ view: "both" });

    await userEvent.click(canvas.getByRole("button", { name: "Reset everything" }));
    await expect(args.onReset).toHaveBeenCalled();
  },
};

export const FontsInTheirOwnFace: Story = {
  args: { defaultOpen: true },
  play: async ({ args, canvas, userEvent }) => {
    const group = canvas.getByRole("group", { name: "Display font" });
    await expect(group).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Love Ya Like A Sister" })).toBeChecked();
    await userEvent.click(canvas.getByText("DynaPuff"));
    await expect(args.onChange).toHaveBeenLastCalledWith({ font: "dynapuff" });
    await expect(canvas.getByRole("radio", { name: "3" })).not.toBeChecked();
  },
};
