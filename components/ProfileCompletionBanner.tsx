"use client";

import { useState } from "react";
import Link from "next/link";
import { UserCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileCompletionBannerProps {
  userId: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  hasSkills: boolean;
  settings: Record<string, unknown> | null;
}

export function ProfileCompletionBanner({
  userId,
  avatarUrl,
  bio,
  phone,
  hasSkills,
  settings,
}: ProfileCompletionBannerProps) {
  const dismissCount = (settings?.profile_reminder_dismissed as number) ?? 0;
  const [dismissed, setDismissed] = useState(false);

  // Nach 3x Dismissal nie wieder anzeigen
  if (dismissCount >= 3 || dismissed) return null;

  // Fortschritt berechnen
  const steps = [
    { done: !!avatarUrl, label: "Avatar" },
    { done: !!bio, label: "Bio" },
    { done: hasSkills, label: "Kompetenzen" },
    { done: !!phone, label: "Telefon" },
  ];
  const completed = steps.filter((s) => s.done).length;

  // Profil ist vollstaendig
  if (completed === 4) return null;

  async function handleDismiss() {
    setDismissed(true);
    const supabase = createClient();
    const newSettings = { ...(settings || {}), profile_reminder_dismissed: dismissCount + 1 };
    await supabase.from("users").update({ settings: newSettings }).eq("id", userId);
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-quartier-green/20 bg-gradient-to-br from-quartier-green/8 via-quartier-green/5 to-quartier-green/12 p-4 shadow-soft">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-white/50"
        aria-label="Spaeter erinnern"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10">
          <UserCircle className="h-6 w-6 text-quartier-green" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-anthrazit">
            Profil vervollständigen ({completed}/4)
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {completed === 0
              ? "Stellen Sie sich Ihren Nachbarn vor!"
              : `Noch ${4 - completed} ${4 - completed === 1 ? "Angabe fehlt" : "Angaben fehlen"}.`
            }
          </p>

          {/* Fortschrittsbalken */}
          <div className="mt-2 flex gap-1">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step.done ? "bg-quartier-green" : "bg-quartier-green/20"
                }`}
                title={step.label}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="rounded-lg bg-quartier-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-quartier-green-dark"
            >
              Jetzt ergänzen
            </Link>
            <button
              onClick={handleDismiss}
              className="px-2 py-1.5 text-xs text-muted-foreground hover:text-anthrazit"
            >
              Später ({3 - dismissCount}x)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
