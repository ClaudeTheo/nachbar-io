"use client";

import { CH_SOZIALAEMTER } from "@/lib/leistungen/ch-sozialaemter";
import { CURATED_CANTONS, type SwissCanton } from "@/lib/leistungen/types";

export type KantonsSchalterValue = SwissCanton | "OTHER";

interface Props {
  value: KantonsSchalterValue;
  onChange: (value: KantonsSchalterValue) => void;
  /** Nur relevant wenn value='OTHER' — zeigt Sozialamt-Link fuer den tatsaechlichen Wohnkanton. */
  otherCanton?: string | null;
}

const CANTON_LABELS: Record<SwissCanton, string> = {
  AG: "Aargau",
  BL: "Basel-Landschaft",
  BS: "Basel-Stadt",
  SH: "Schaffhausen",
  TG: "Thurgau",
  ZH: "Zürich",
};

export function KantonsSchalter({ value, onChange, otherCanton }: Props) {
  const showOther = value === "OTHER" && otherCanton;
  const sozialamt = showOther ? CH_SOZIALAEMTER[otherCanton] : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <label
        htmlFor="kantons-schalter"
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        Ihr Kanton
      </label>
      <select
        id="kantons-schalter"
        value={value}
        onChange={(e) => onChange(e.target.value as KantonsSchalterValue)}
        className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base"
      >
        {CURATED_CANTONS.map((c) => (
          <option key={c} value={c}>
            {CANTON_LABELS[c]}
          </option>
        ))}
        <option value="OTHER">Anderer Kanton …</option>
      </select>

      {sozialamt ? (
        <p className="mt-3 text-sm text-gray-700">
          Für <span className="font-medium">{sozialamt.name}</span> (Kanton{" "}
          {otherCanton}) wenden Sie sich bitte direkt an{" "}
          <a
            href={sozialamt.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2F6F4F] underline underline-offset-4"
          >
            {sozialamt.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
