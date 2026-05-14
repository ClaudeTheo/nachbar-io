import type { Meta, StoryObj } from "@storybook/nextjs";

import { YouthExchangeSurface } from "@/modules/youth/components/YouthExchangeSurface";

const meta = {
  title: "Jugend/Tauschen und Verschenken",
  component: YouthExchangeSurface,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
} satisfies Meta<typeof YouthExchangeSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  decorators: [
    (Story) => (
      <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
        <Story />
      </main>
    ),
  ],
};
