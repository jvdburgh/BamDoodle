import type { Preview } from "@storybook/react-vite";
import { BrandSketchFilter } from "../src/components/brand/BrandSketchFilter.component";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    a11y: { test: "error" },
  },
  decorators: [
    // Stories that render the filter themselves set `parameters.sketchFilter: false` to avoid a duplicate id.
    (Story, { parameters }) =>
      parameters.sketchFilter === false ? (
        <Story />
      ) : (
        <>
          <BrandSketchFilter />
          <Story />
        </>
      ),
  ],
};

export default preview;
