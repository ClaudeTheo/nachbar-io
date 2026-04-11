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
    // Task C-4: stabile Route /mein-kreis, die den meine-senioren Screen rendert.
    href: "/mein-kreis",
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
    description: "Nachricht oder Termin — mit KI-Hilfe",
    // Task H-1: /schreiben zeigt die Vertrauenskontakte als Kacheln und
    // oeffnet WhatsApp mit einem Tap. KI-Hilfe folgt in Phase 2.
    href: "/schreiben",
    variant: "neutral",
  },
  {
    label: "Notfall",
    description: "Hilfe rufen",
    href: "/sos",
    variant: "emergency",
  },
];

export default function KreisStartPage() {
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
                ? "flex flex-col items-center justify-center rounded-2xl border-2 border-red-600 bg-red-600 p-6 text-center text-white focus:outline-none focus:ring-4 focus:ring-red-300"
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
    </section>
  );
}
