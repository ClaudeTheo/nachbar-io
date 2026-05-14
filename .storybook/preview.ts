import type { Preview } from "@storybook/nextjs";
import { createElement, type CSSProperties } from "react";

import "../app/globals.css";

const storybookFontVariables = {
  "--font-heading": '"Nunito", "Segoe UI", system-ui, sans-serif',
  "--font-sans": '"Nunito Sans", "Segoe UI", system-ui, sans-serif',
  "--font-geist-mono": '"SFMono-Regular", Consolas, monospace',
} satisfies CSSProperties;

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(
        "div",
        {
          className: "font-sans antialiased",
          style: storybookFontVariables,
        },
        createElement(Story),
      ),
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
