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
}

export function AccessLevelBanner({ level, showUpgradeHint = false }: AccessLevelBannerProps) {
  const config = LEVEL_CONFIG[level];

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
