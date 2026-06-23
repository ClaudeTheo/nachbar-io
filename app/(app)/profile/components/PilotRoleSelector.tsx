"use client";

// Pilot-Selbstauskunft-Selektor (W4b-2). Reine Praesentation: zeigt die drei
// selbst-waehlbaren Rollen (resident/caregiver/helper) — bewusst OHNE "test_user".
import { Handshake, HeartHandshake, UserRound, CheckCircle2 } from "lucide-react";
import type { SelfSelectablePilotRole } from "@/lib/services/profile.service";

const ROLE_OPTIONS: Array<{
  role: SelfSelectablePilotRole;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    role: "resident",
    label: "Ich nutze die App für mich",
    description: "Für Menschen, die selbst Hinweise und Hilfe im Alltag bekommen möchten.",
    icon: UserRound,
  },
  {
    role: "caregiver",
    label: "Ich unterstütze jemanden",
    description: "Für Angehörige oder Begleiter, die einer Person im Alltag helfen.",
    icon: HeartHandshake,
  },
  {
    role: "helper",
    label: "Ich helfe im Quartier",
    description: "Für Nachbarn und Helfer in der Nachbarschaft.",
    icon: Handshake,
  },
];

export function PilotRoleSelector({
  value,
  onChange,
  disabled,
}: {
  value: SelfSelectablePilotRole | null;
  onChange: (role: SelfSelectablePilotRole) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {ROLE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
        <button
          key={role}
          type="button"
          disabled={disabled}
          onClick={() => onChange(role)}
          className={`min-h-[80px] w-full rounded-lg border-2 p-4 text-left transition-colors disabled:opacity-60 ${
            value === role
              ? "border-quartier-green bg-quartier-green/5"
              : "border-border hover:border-quartier-green/50"
          }`}
          aria-pressed={value === role}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
              <Icon className="h-5 w-5 text-quartier-green" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-anthrazit">{label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
            </span>
            {value === role && (
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-quartier-green" aria-hidden="true" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
