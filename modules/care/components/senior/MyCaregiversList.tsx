// modules/care/components/senior/MyCaregiversList.tsx
// Welle S2 (C2:2): Reverse-Ansicht von "Mein Kreis" aus Bewohner-Sicht — wer
// gehoert zu meinem Kreis. Grosse Kacheln (Name, Foto), pro Person ein Weg zur
// Nachricht. Anruf folgt mit der Video-Welle (S2 Schritt 5).
"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { CaregiverInfo } from "@/modules/care/hooks/useMyCaregivers";

// Beziehungs-Label menschlich lesbar (roh aus caregiver_links.relationship_type).
const RELATIONSHIP_LABEL: Record<string, string> = {
  child: "Kind",
  parent: "Elternteil",
  sibling: "Geschwister",
  spouse: "Partnerin / Partner",
  relative: "Angehörige(r)",
  friend: "Freundin / Freund",
  neighbor: "Nachbarschaft",
  care_service: "Pflegedienst",
};

function relationshipLabel(type: string | null): string {
  if (!type) return "In Ihrem Kreis";
  return RELATIONSHIP_LABEL[type] ?? "In Ihrem Kreis";
}

export function MyCaregiversList({
  caregivers,
}: {
  caregivers: CaregiverInfo[];
}) {
  return (
    <div className="grid gap-3" data-testid="my-caregivers-list">
      {caregivers.map((c) => (
        <div key={c.id} className="rounded-2xl border-2 border-anthrazit/15 bg-white p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {c.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.avatar_url}
                  alt={c.display_name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-quartier-green/20 text-xl font-semibold text-quartier-green">
                  {c.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + Beziehung */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold text-anthrazit">
                {c.display_name}
              </p>
              <p className="text-base text-muted-foreground">
                {relationshipLabel(c.relationship_type)}
              </p>
            </div>
          </div>

          {/* Aktion: Nachricht */}
          <div className="mt-3">
            <Link
              href="/messages"
              aria-label={`${c.display_name} eine Nachricht schreiben`}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-quartier-green bg-quartier-green px-5 text-lg font-semibold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
              style={{ minHeight: "56px" }}
            >
              <MessageCircle className="h-6 w-6" />
              Nachricht
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
