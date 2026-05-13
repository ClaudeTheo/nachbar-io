"use client";

import dynamic from "next/dynamic";

import {
  LOCAL_ACTIVITY_PIN_PREVIEW_CENTER,
  LOCAL_ACTIVITY_PIN_PREVIEW_PINS,
  LOCAL_ACTIVITY_PIN_PREVIEW_TILE_URL,
} from "@/lib/map-activity-preview";
import {
  MAP_ACTIVITY_PIN_DEFINITIONS,
  MAP_ACTIVITY_PIN_TYPES,
} from "@/lib/map-activity-pins";

const LeafletMapInner = dynamic(() => import("@/components/LeafletMapInner"), {
  ssr: false,
});

export function ActivityPinsMapPreviewClient() {
  return (
    <main className="min-h-screen bg-[#071923] px-4 py-4 text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              Lokale Sichtprobe
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Activity-Pins auf der Quartierskarte
            </h1>
          </div>
          <p className="max-w-xl text-sm text-cyan-50/75">
            Statische Beispiel-Pins auf anonymisierten Haus-Ankern. Die Karte
            nutzt echte Leaflet/OpenStreetMap-Kacheln.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-[20px] border border-cyan-200/20 bg-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="h-[min(72vh,720px)] min-h-[520px]">
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
          </div>

          <aside className="rounded-[20px] border border-cyan-200/20 bg-white/8 p-4 backdrop-blur">
            <h2 className="text-base font-semibold text-cyan-50">
              Erste 10 Pins
            </h2>
            <div className="mt-3 grid gap-2">
              {MAP_ACTIVITY_PIN_TYPES.map((type) => {
                const definition = MAP_ACTIVITY_PIN_DEFINITIONS[type];

                return (
                  <div
                    key={type}
                    className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"
                  >
                    <span
                      className="h-3 w-3 rounded-full shadow-[0_0_18px_currentColor]"
                      style={{ color: definition.color, background: definition.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {definition.label}
                      </p>
                      <p className="text-xs text-cyan-50/60">
                        {definition.shortLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
