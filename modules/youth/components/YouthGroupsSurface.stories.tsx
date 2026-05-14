import type { Meta, StoryObj } from "@storybook/nextjs";

import { YouthGroupsSurface } from "@/modules/youth/components/YouthGroupsSurface";

const meta = {
  title: "Jugend/Gruppen",
  component: YouthGroupsSurface,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
} satisfies Meta<typeof YouthGroupsSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Geschuetzt: Story = {
  decorators: [
    (Story) => (
      <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
        <Story />
      </main>
    ),
  ],
};
