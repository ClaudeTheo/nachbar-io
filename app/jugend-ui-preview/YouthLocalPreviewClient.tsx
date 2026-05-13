"use client";

import dynamic from "next/dynamic";

import { YouthHomeSurface } from "@/modules/youth/components/YouthHomeSurface";
import {
  LOCAL_ACTIVITY_PIN_PREVIEW_CENTER,
  LOCAL_ACTIVITY_PIN_PREVIEW_PINS,
  LOCAL_ACTIVITY_PIN_PREVIEW_TILE_URL,
} from "@/lib/map-activity-preview";
import type { YouthProfileData } from "@/modules/youth/services/hooks";
import type { MapActivityPin } from "@/lib/map-activity-pins";

const LeafletMapInner = dynamic(() => import("@/components/LeafletMapInner"), {
  ssr: false,
});

const previewProfile: YouthProfileData = {
  access_level: "freigeschaltet",
  age_group: "u16",
  birth_year: 2011,
  quarter_id: "local-preview-bad-saeckingen",
  total_points: 420,
};

const previewTasks: Array<{
  id: string;
  title: string;
  type: MapActivityPin["type"];
  points: number;
  meta: string;
}> = [
  {
    id: "learn",
    title: "Lerntreff am Rhein",
    type: "learning",
    points: 35,
    meta: "Heute · Treffpunkt",
  },
  {
    id: "sport",
    title: "Sport & Spiel am Platz",
    type: "sport",
    points: 20,
    meta: "Nachmittag · Gruppe",
  },
  {
    id: "mowing",
    title: "Rasenhilfe gesucht",
    type: "mowing",
    points: 45,
    meta: "Dringend · Hausanker",
  },
];

const taskLabel: Record<MapActivityPin["type"], string> = {
  companion: "Begleitung",
  event: "Event",
  gardening: "Garten",
  learning: "Lernen",
  meeting: "Treffen",
  mowing: "Mähen",
  shopping: "Einkauf",
  sport: "Sport",
  tech: "Technik",
  warning: "Hinweis",
};

function PreviewMapSlot() {
  return (
    <div className="h-[430px] overflow-hidden rounded-[18px]">
      <LeafletMapInner
        activityPins={LOCAL_ACTIVITY_PIN_PREVIEW_PINS}
        center={[...LOCAL_ACTIVITY_PIN_PREVIEW_CENTER]}
        houses={[]}
        onHouseClick={() => undefined}
        residentCounts={{}}
        showBuildingOutlines={false}
        statuses={{}}
        tileUrl={LOCAL_ACTIVITY_PIN_PREVIEW_TILE_URL}
        userCtx={{ role: "resident", plan: "free" }}
        zoom={17}
      />
    </div>
  );
}

function PreviewTaskSlot() {
  return (
    <div className="space-y-3">
      {previewTasks.map((task) => (
        <div
          key={task.id}
          className="rounded-[20px] border border-white/12 bg-white/[0.075] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-white">{task.title}</p>
              <p className="mt-1 text-xs font-semibold text-cyan-50/58">
                {task.meta}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-lime-200">
                {task.points} Punkte
              </p>
              <p className="mt-1 text-xs text-cyan-50/55">
                {taskLabel[task.type]}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function YouthLocalPreviewClient() {
  return (
    <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
      <YouthHomeSurface
        mapSlot={<PreviewMapSlot />}
        preview
        profile={previewProfile}
        taskSlot={<PreviewTaskSlot />}
      />
    </main>
  );
}
