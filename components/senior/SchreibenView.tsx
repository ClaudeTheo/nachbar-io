// components/senior/SchreibenView.tsx
// Task H-1 → H-2: Stateless View fuer /schreiben (Senior-UI).
//
// Regeln aus Phase-1 Design-Doc 2026-04-10 (wie kreis-start):
//   - Touch-Targets >=80px
//   - Hoher Kontrast (Anthrazit auf Weiss), WCAG AA
//   - Keine Badges, keine Feeds
//   - Siezen-Ansprache, keine Emojis
//   - Inline-Styles fuer min-height (testbar via jsdom)
//
// Die Komponente laedt keine Daten — sie bekommt bereits transformierte
// SchreibenContact[] und rendert drei Zustaende:
//   1. Leer → Einrichtungs-Hinweis mit Link auf /care/profile
//   2. Nur gueltige Nummern → anklickbare Kacheln → /schreiben/mic/:index
//   3. Gemischt → ungueltige Kontakte sind ausgegraute Nicht-Links
//
// Tippen auf eine Kachel navigiert zur Mikrofon-Seite, wo der Senior
// eine Sprachnachricht diktiert (Voice-Flow H-2/H-3/H-4).

import Link from "next/link";
import type { SchreibenContact } from "@/lib/messaging/schreiben-contacts";

interface SchreibenViewProps {
  contacts: SchreibenContact[];
}

const TILE_BASE_STYLE: React.CSSProperties = {
  minHeight: "96px",
  minWidth: "80px",
};

export function SchreibenView({ contacts }: SchreibenViewProps) {
  if (contacts.length === 0) {
    return (
      <section aria-label="Schreiben">
        <h1 className="text-2xl font-bold text-anthrazit mb-4">Schreiben</h1>
        <div
          className="rounded-2xl border-2 border-dashed border-anthrazit/40 bg-white p-6 text-center"
          style={{ minHeight: "160px" }}
        >
          <p className="text-lg font-semibold text-anthrazit">
            Ihr Kreis ist noch nicht eingerichtet
          </p>
          <p className="mt-2 text-base text-anthrazit/80">
            Tragen Sie Familie oder Nachbarn in Ihren Kreis ein, damit Sie ihnen
            hier schreiben koennen.
          </p>
          <Link
            href="/care/profile"
            className="mt-5 inline-flex items-center justify-center rounded-xl border-2 border-anthrazit bg-white px-5 py-3 text-base font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
            style={{ minHeight: "56px" }}
          >
            Kreis einrichten
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Schreiben">
      <h1 className="text-2xl font-bold text-anthrazit mb-4">Schreiben</h1>
      <p className="mb-4 text-base text-anthrazit/80">
        Tippen Sie auf eine Person, um ihr eine Nachricht zu diktieren.
      </p>
      <ul className="flex flex-col gap-3">
        {contacts.map((contact, index) => {
          const key = `${contact.name}-${index}`;

          if (contact.phone === null) {
            return (
              <li key={key}>
                <div
                  data-testid="schreiben-contact-tile"
                  aria-disabled="true"
                  className="flex flex-col items-start justify-center rounded-2xl border-2 border-anthrazit/30 bg-anthrazit/5 p-4 text-anthrazit/60"
                  style={TILE_BASE_STYLE}
                >
                  <span className="text-xl font-bold leading-tight">
                    {contact.name}
                  </span>
                  <span className="mt-1 text-base font-normal">
                    {contact.relationship}
                  </span>
                  <span className="mt-2 text-sm italic">
                    Keine Nummer hinterlegt
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={key}>
              <Link
                data-testid="schreiben-contact-tile"
                href={`/schreiben/mic/${contact.index}`}
                className="flex flex-col items-start justify-center rounded-2xl border-2 border-anthrazit bg-white p-4 text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
                style={TILE_BASE_STYLE}
              >
                <span className="text-xl font-bold leading-tight">
                  {contact.name}
                </span>
                <span className="mt-1 text-base font-normal">
                  {contact.relationship}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
