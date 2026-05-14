import type { Meta, StoryObj } from "@storybook/nextjs";

import { ActivityPinIcon } from "@/components/map/ActivityPinIcon";
import {
  MAP_ACTIVITY_PIN_COLOR_STATES,
  MAP_ACTIVITY_PIN_DEFINITIONS,
  MAP_ACTIVITY_PIN_TYPES,
  type MapActivityPinColorState,
} from "@/lib/map-activity-pins";

const meta = {
  title: "Karte/Activity Pins",
  component: ActivityPinIcon,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ActivityPinIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ErsteZehn: Story = {
  args: {
    type: "learning",
  },
  render: () => (
    <div className="min-h-screen bg-[#071923] p-6 text-white">
      <div className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-5">
        {MAP_ACTIVITY_PIN_TYPES.map((type) => {
          const definition = MAP_ACTIVITY_PIN_DEFINITIONS[type];

          return (
            <article
              key={type}
              className="rounded-[18px] border border-white/12 bg-white/[0.07] p-4 text-center"
            >
              <div className="flex justify-center">
                <ActivityPinIcon
                  type={type}
                  size={48}
                  title={definition.label}
                />
              </div>
              <p className="mt-2 text-sm font-black">{definition.label}</p>
              <p className="mt-1 text-xs text-cyan-50/60">
                {definition.description}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  ),
};

export const FarbLogik: Story = {
  args: {
    type: "mowing",
  },
  render: () => (
    <div className="grid min-h-screen gap-4 bg-[#071923] p-6 text-white sm:grid-cols-4">
      {(Object.keys(MAP_ACTIVITY_PIN_COLOR_STATES) as MapActivityPinColorState[]).map(
        (state) => {
          const definition = MAP_ACTIVITY_PIN_COLOR_STATES[state];

          return (
            <article
              key={state}
              className="rounded-[18px] border border-white/12 bg-white/[0.07] p-4 text-center"
            >
              <div className="flex justify-center">
                <ActivityPinIcon
                  type={state === "red" ? "warning" : "mowing"}
                  colorState={state}
                  size={56}
                  title={definition.label}
                />
              </div>
              <p className="mt-2 text-sm font-black">{definition.label}</p>
              <p className="mt-1 text-xs text-cyan-50/60">
                {state === "green" && "Normal sichtbar"}
                {state === "yellow" && "Dringend"}
                {state === "red" && "Nur Unfall/Notfall"}
                {state === "blue" && "Sonderstatus, z.B. Urlaub"}
              </p>
            </article>
          );
        },
      )}
    </div>
  ),
};
