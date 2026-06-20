// app/(senior)/kreis-start/page.tsx
// Phase 1 Design-Doc 2026-04-10 Abschnitt 3: 4-Kachel-Startscreen fuer Bewohner 65+.
// Regeln:
//   - Genau 4 Kacheln: MEIN KREIS, HIER BEI MIR, SCHREIBEN, NOTFALL
//   - Touch-Targets >= 80px (Senior-Mode-Regel, CLAUDE.md)
//   - WCAG AA Kontrast (Anthrazit #2D3142 auf Weiss erfuellt AAA)
//   - Keine Badges mit Zahlen (Design-Doc 3.1)
//   - Keine Feeds, kein unendliches Scrollen
//   - Siezen, kein Emoji ausser bei NOTFALL

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getSeniorHouseholdPhotos,
  getSeniorHouseholdStickies,
} from "@/modules/care/services/senior-kiosk.service";
import { FamilienMomentCard } from "@/modules/care/components/senior/FamilienMomentCard";
import { StickyNotesList } from "@/modules/care/components/senior/StickyNotesList";

type TileDef = {
  label: string;
  description: string;
  href: string;
  variant: "neutral" | "emergency";
};

const TILES: TileDef[] = [
  {
    label: "Mein Kreis",
    description: "Familie, Nachrichten, Video anrufen",
    // Welle F2 (C2:2): Senior-Shell-Route /familienkreis (Reverse-Circle, 80px),
    // damit der Senior beim Tap in der (senior)-Shell bleibt statt in die
    // (app)-Shell (/mein-kreis) mit BottomNav ohne 112-Footer zu fallen.
    href: "/familienkreis",
    variant: "neutral",
  },
  {
    label: "Hier bei mir",
    description: "Wetter, Müll, was gerade ist",
    // Route wird in Task B-5 (quartier vs quartier-info Drift) final entschieden.
    // Bis dahin linken wir auf den Platzhalter-Pfad.
    href: "/hier-bei-mir",
    variant: "neutral",
  },
  {
    label: "Schreiben",
    // Welle S2 (A1:6): kein KI-Versprechen, solange AI_PROVIDER_OFF im Pilot
    // gilt — der Senior tippt oder diktiert, KI-Hilfe folgt nach dem AVV-Go.
    description: "Nachricht oder Termin schreiben",
    // Task H-1: /schreiben zeigt die Vertrauenskontakte als Kacheln und
    // oeffnet WhatsApp mit einem Tap.
    href: "/schreiben",
    variant: "neutral",
  },
  {
    label: "Notfall 112",
    description: "Hilfe rufen",
    href: "/sos",
    variant: "emergency",
  },
];

export default async function KreisStartPage() {
  // SB-2: neuestes Familienfoto laden (RLS-scoped auf den eigenen Haushalt).
  // Fehler/leerer Haushalt -> Karte wird einfach nicht angezeigt (additiv).
  const supabase = await createClient();
  const [photos, stickies] = await Promise.all([
    getSeniorHouseholdPhotos(supabase, { limit: 1 }),
    getSeniorHouseholdStickies(supabase),
  ]);
  const newest = photos[0] ?? null;
  const momentPhoto = newest
    ? {
        url: newest.url,
        caption: newest.caption,
        uploaderId: newest.uploaderId,
      }
    : null;
  const stickyItems = stickies.map((s) => ({ id: s.id, title: s.title }));

  return (
    <section aria-label="Startbildschirm">
      <h1 className="sr-only">Startbildschirm</h1>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        {TILES.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            data-testid="kreis-start-tile"
            className={
              tile.variant === "emergency"
                ? "flex flex-col items-center justify-center rounded-2xl border-2 border-red-950 bg-red-900 p-6 text-center text-white focus:outline-none focus:ring-4 focus:ring-red-300"
                : "flex flex-col items-center justify-center rounded-2xl border-2 border-anthrazit bg-white p-6 text-center text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
            }
            style={{
              // Senior-Regel: Touch-Target minimum 80px — grosszuegig auf 160px
              // ausgelegt, damit die Kachel-Proportion fuer 65+ passt.
              minHeight: "160px",
              minWidth: "80px",
            }}
          >
            <span className="text-2xl font-bold leading-tight">
              {tile.label}
            </span>
            <span className="mt-2 text-base font-normal leading-snug opacity-90">
              {tile.description}
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Tippen Sie auf eine Kachel, um fortzufahren.
      </p>

      <div
        className="mt-8 grid grid-cols-2 gap-4"
        data-testid="kreis-start-secondary-actions"
      >
        <Link
          href="/mein-kreis/termine"
          className="inline-flex items-center justify-center rounded-2xl border-2 border-anthrazit/20 bg-white px-4 text-center text-base font-semibold text-anthrazit transition-colors hover:border-anthrazit/50 hover:bg-gray-50"
          data-testid="kreis-start-termine-link"
          style={{ minHeight: "80px", minWidth: "80px" }}
        >
          Termine
        </Link>
        <Link
          href="/profil"
          className="inline-flex items-center justify-center rounded-2xl border-2 border-anthrazit/20 bg-white px-4 text-center text-base font-semibold text-anthrazit transition-colors hover:border-anthrazit/50 hover:bg-gray-50"
          data-testid="kreis-start-profil-link"
          style={{ minHeight: "80px", minWidth: "80px" }}
        >
          Mein Profil
        </Link>
        {/* SP1-3: Tagesrätsel als Sekundär-Aktion (volle Zeile, NICHT 5. Kachel). */}
        <Link
          href="/raetsel"
          className="col-span-2 inline-flex items-center justify-center rounded-2xl border-2 border-anthrazit/20 bg-white px-4 text-center text-base font-semibold text-anthrazit transition-colors hover:border-anthrazit/50 hover:bg-gray-50"
          data-testid="kreis-start-raetsel-link"
          style={{ minHeight: "80px", minWidth: "80px" }}
        >
          Tagesrätsel — kleine Denkpause
        </Link>
        {/* SP2-1: „Paare finden" mit Familienfotos — Sekundär-Aktion, NICHT 5. Kachel. */}
        <Link
          href="/spiele/paare-finden"
          className="col-span-2 inline-flex items-center justify-center rounded-2xl border-2 border-anthrazit/20 bg-white px-4 text-center text-base font-semibold text-anthrazit transition-colors hover:border-anthrazit/50 hover:bg-gray-50"
          data-testid="kreis-start-paare-link"
          style={{ minHeight: "80px", minWidth: "80px" }}
        >
          Paare finden — mit Familienfotos
        </Link>
        {/* SP2-2: „Erinnerung der Woche" — Sekundär-Aktion, NICHT 5. Kachel. */}
        <Link
          href="/erinnerung"
          className="col-span-2 inline-flex items-center justify-center rounded-2xl border-2 border-anthrazit/20 bg-white px-4 text-center text-base font-semibold text-anthrazit transition-colors hover:border-anthrazit/50 hover:bg-gray-50"
          data-testid="kreis-start-erinnerung-link"
          style={{ minHeight: "80px", minWidth: "80px" }}
        >
          Erinnerung der Woche
        </Link>
      </div>

      {/* SB-2: „Erster gemeinsamer Moment" — unter dem Kachel-Grid, nie als 5. Kachel. */}
      <FamilienMomentCard photo={momentPhoto} />

      {/* SB-4: offene Zettel der Familie mit Ein-Tap-Quittung — unter dem Grid. */}
      <StickyNotesList stickies={stickyItems} />
    </section>
  );
}
