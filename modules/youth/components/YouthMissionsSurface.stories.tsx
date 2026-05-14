import type { Meta, StoryObj } from "@storybook/nextjs";

import { YouthMissionsSurface } from "@/modules/youth/components/YouthMissionsSurface";
import type { YouthProfileData } from "@/modules/youth/services/hooks";

const previewProfile: YouthProfileData = {
  access_level: "freigeschaltet",
  age_group: "u16",
  birth_year: 2011,
  quarter_id: "storybook-bad-saeckingen",
  total_points: 420,
};

function StorybookTaskSlot() {
  const tasks = [
    ["Lerntreff am Rhein", "Heute · Treffpunkt", "35 Punkte"],
    ["Sport & Spiel am Platz", "Nachmittag · Gruppe", "20 Punkte"],
    ["Rasenhilfe gesucht", "Dringend · Hausanker", "45 Punkte"],
  ] as const;

  return (
    <div className="space-y-3">
      {tasks.map(([title, meta, points]) => (
        <article
          key={title}
          className="rounded-[20px] border border-white/12 bg-white/[0.075] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-white">{title}</p>
              <p className="mt-1 text-xs font-semibold text-cyan-50/58">
                {meta}
              </p>
            </div>
            <p className="text-right text-sm font-black text-lime-200">
              {points}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

const meta = {
  title: "Jugend/Missionen",
  component: YouthMissionsSurface,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
} satisfies Meta<typeof YouthMissionsSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LiveMissionen: Story = {
  args: {
    profile: previewProfile,
    preview: true,
    taskSlot: <StorybookTaskSlot />,
  },
  decorators: [
    (Story) => (
      <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
        <Story />
      </main>
    ),
  ],
};
