import Link from "next/link";

interface Props {
  hasPlus: boolean;
}

// Teaser in "Mein Kreis": zeigt Einstieg in Leistungen-Info.
// Plus-Nutzer landen direkt auf der Seite, Free-Nutzer auf der Abo-Uebersicht
// (mit Herkunfts-Param fuer Analytics/Rueckweg).
export function PlusTeaserKarte({ hasPlus }: Props) {
  const href = hasPlus
    ? "/was-steht-uns-zu"
    : "/einstellungen/abo?from=leistungen";

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[#2F6F4F]/20 bg-gradient-to-br from-[#F0F7F4] to-white p-5 transition hover:border-[#2F6F4F]/40"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Was steht uns zu?
        </h3>
        <span className="rounded-full bg-[#2F6F4F] px-3 py-1 text-xs font-semibold text-white">
          Plus
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-gray-700">
        {hasPlus
          ? "5 wichtige Pflege-Leistungen auf einen Blick — mit offiziellen Quellen."
          : "Nur für Plus: 5 wichtige Pflege-Leistungen auf einen Blick — mit offiziellen Quellen."}
      </p>
      <p className="mt-3 text-sm font-medium text-[#2F6F4F]">
        {hasPlus ? "Jetzt entdecken →" : "Plus aktivieren →"}
      </p>
    </Link>
  );
}
