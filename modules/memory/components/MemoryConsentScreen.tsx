"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface MemoryConsentScreenProps {
  onConsent: (consents: {
    memory_basis: boolean;
    memory_care: boolean;
    memory_personal: boolean;
  }) => void;
  onSkip: () => void;
}

// Freundliches KI-Gesicht als SVG
function AiFace() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="mx-auto h-20 w-20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Kopf */}
      <circle cx="40" cy="40" r="36" fill="#4CAF87" opacity="0.15" />
      <circle cx="40" cy="40" r="36" stroke="#4CAF87" strokeWidth="2" />
      {/* Augen */}
      <circle cx="28" cy="34" r="4" fill="#2D3142" />
      <circle cx="52" cy="34" r="4" fill="#2D3142" />
      {/* Lichtpunkte */}
      <circle cx="29.5" cy="32.5" r="1.5" fill="white" />
      <circle cx="53.5" cy="32.5" r="1.5" fill="white" />
      {/* Laecheln */}
      <path
        d="M28 48 Q40 58 52 48"
        stroke="#2D3142"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Antenne / KI-Symbol */}
      <circle cx="40" cy="8" r="3" fill="#4CAF87" />
      <line x1="40" y1="11" x2="40" y2="4" stroke="#4CAF87" strokeWidth="2" />
    </svg>
  );
}

const CONSENT_ITEMS = [
  {
    key: "memory_basis" as const,
    label: "Profil, Routinen, Vorlieben, Kontakte",
    description:
      "Ihr Name, Ihre täglichen Gewohnheiten, was Sie mögen und wer Ihre Kontakte sind.",
    defaultOn: true,
  },
  {
    key: "memory_care" as const,
    label: "Alltagsbedürfnisse",
    description:
      "Wobei Sie im Alltag Unterstützung brauchen — z.B. Einkaufen, Treppensteigen.",
    defaultOn: false,
  },
  {
    key: "memory_personal" as const,
    label: "Private Notizen",
    description:
      "Persönliche Informationen, die Sie dem Assistenten anvertrauen möchten.",
    defaultOn: false,
  },
];

export function MemoryConsentScreen({
  onConsent,
  onSkip,
}: MemoryConsentScreenProps) {
  const [consents, setConsents] = useState({
    memory_basis: true,
    memory_care: false,
    memory_personal: false,
  });

  function handleToggle(key: keyof typeof consents) {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleActivate() {
    onConsent(consents);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <AiFace />

      <div className="text-center">
        <h2 className="text-xl font-semibold text-anthrazit">
          Ihr persönlicher Assistent
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ihr Nachbar-Assistent kann sich Dinge über Sie merken, um Ihnen besser
          helfen zu können. Sie entscheiden, was er sich merken darf.
        </p>
      </div>

      <div className="space-y-3">
        {CONSENT_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleToggle(item.key)}
            className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/50"
            style={{ minHeight: "80px" }}
          >
            <div className="flex-1">
              <p className="font-medium text-anthrazit">{item.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Switch
              checked={consents[item.key]}
              onCheckedChange={() => handleToggle(item.key)}
              aria-label={item.label}
            />
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Keine Diagnosen, Medikamente oder Vitalwerte werden gespeichert.
        <br />
        Sie können diese Einstellungen jederzeit ändern.
      </p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleActivate}
          className="h-14 w-full bg-quartier-green text-base hover:bg-quartier-green-dark"
          disabled={!consents.memory_basis && !consents.memory_care && !consents.memory_personal}
        >
          Gedächtnis aktivieren
        </Button>
        <Button
          onClick={onSkip}
          variant="ghost"
          className="h-14 w-full text-base text-muted-foreground"
        >
          Ohne Gedächtnis nutzen
        </Button>
      </div>
    </div>
  );
}
