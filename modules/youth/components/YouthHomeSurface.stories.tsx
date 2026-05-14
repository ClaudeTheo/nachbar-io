import type { Meta, StoryObj } from "@storybook/nextjs";

import { ActivityPinIcon } from "@/components/map/ActivityPinIcon";
import { YouthHomeSurface } from "@/modules/youth/components/YouthHomeSurface";
import type { YouthProfileData } from "@/modules/youth/services/hooks";

const previewProfile: YouthProfileData = {
  access_level: "freigeschaltet",
  age_group: "u16",
  birth_year: 2011,
  quarter_id: "storybook-bad-saeckingen",
  total_points: 420,
};

const mapPins = [
  { type: "learning", label: "Lernen", className: "left-[18%] top-[48%]" },
  { type: "sport", label: "Sport", className: "left-[55%] top-[30%]" },
  { type: "mowing", label: "Hilfe", className: "left-[70%] top-[58%]" },
  { type: "meeting", label: "Treffen", className: "left-[36%] top-[66%]" },
] as const;

function StorybookMapSlot() {
  return (
    <div className="relative h-[360px] overflow-hidden rounded-[18px] bg-[#0b2430]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(132,204,22,0.18),transparent_30%),radial-gradient(circle_at_80%_72%,rgba(34,211,238,0.2),transparent_28%),linear-gradient(135deg,#173948,#071923)]" />
      <div className="absolute left-[-10%] top-[52%] h-2 w-[130%] -rotate-12 rounded-full bg-cyan-200/45 shadow-[0_0_28px_rgba(103,232,249,0.55)]" />
      <div className="absolute left-[26%] top-[-10%] h-[120%] w-1 rotate-[28deg] rounded-full bg-white/10" />
      <div className="absolute inset-x-8 bottom-7 h-20 rounded-[50%] border border-lime-100/18 bg-lime-300/10" />
      {mapPins.map((pin) => (
        <div
          key={pin.type}
          className={`absolute -translate-x-1/2 -translate-y-1/2 text-center ${pin.className}`}
        >
          <ActivityPinIcon type={pin.type} size={42} title={pin.label} />
          <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/70">
            {pin.label}
          </span>
        </div>
      ))}
    </div>
  );
}

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
  title: "Jugend/Start",
  component: YouthHomeSurface,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
} satisfies Meta<typeof YouthHomeSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Freigeschaltet: Story = {
  args: {
    profile: previewProfile,
    preview: true,
    mapSlot: <StorybookMapSlot />,
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

export const OhneProfil: Story = {
  args: {
    profile: null,
    preview: true,
  },
  decorators: [
    (Story) => (
      <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
        <Story />
      </main>
    ),
  ],
};
