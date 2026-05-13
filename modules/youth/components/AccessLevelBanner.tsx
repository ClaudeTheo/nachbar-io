// modules/youth/components/AccessLevelBanner.tsx
// Jugend-Modul: Zeigt aktuelle Zugangs-Stufe + Upgrade-Hinweis
'use client';

import type { AccessLevel } from '../services/profile';

const LEVEL_CONFIG: Record<AccessLevel, { label: string; color: string; description: string }> = {
  basis: {
    label: 'Basis',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'Du kannst Aufgaben ansehen und Punkte sammeln.',
  },
  erweitert: {
    label: 'Erweitert',
    color: 'bg-blue-50 text-blue-700 border-blue-300',
    description: 'Du kannst Aufgaben annehmen, chatten und an Events teilnehmen.',
  },
  freigeschaltet: {
    label: 'Freigeschaltet',
    color: 'bg-green-50 text-green-700 border-green-300',
    description: 'Alle Funktionen verfügbar — inkl. Zertifikate und Mentoring.',
  },
};

interface AccessLevelBannerProps {
  level: AccessLevel;
  showUpgradeHint?: boolean;
  variant?: "default" | "youth";
}

export function AccessLevelBanner({
  level,
  showUpgradeHint = false,
  variant = "default",
}: AccessLevelBannerProps) {
  const config = LEVEL_CONFIG[level];

  if (variant === "youth") {
    return (
      <div className="rounded-[22px] border border-cyan-100/18 bg-white/[0.07] p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-50/58">
              Deine Stufe
            </p>
            <p className="mt-1 text-xl font-black">{config.label}</p>
          </div>
          {level === "freigeschaltet" && (
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-300 text-slate-950"
              aria-hidden="true"
            >
              ✓
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-cyan-50/70">
          {config.description}
        </p>
        {showUpgradeHint && level !== "freigeschaltet" && (
          <p className="mt-3 text-sm font-bold text-lime-100">
            Mit Elternfreigabe schaltest du alle Funktionen frei.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${config.color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Deine Stufe</p>
          <p className="text-lg font-bold">{config.label}</p>
        </div>
        {level === 'freigeschaltet' && (
          <span className="text-2xl" aria-hidden="true">✓</span>
        )}
      </div>
      <p className="text-sm mt-2 opacity-80">{config.description}</p>
      {showUpgradeHint && level !== 'freigeschaltet' && (
        <p className="text-sm mt-3 font-medium">
          Tipp: Mit Elternfreigabe schaltest du alle Funktionen frei!
        </p>
      )}
    </div>
  );
}
