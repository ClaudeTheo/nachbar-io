import type { CantonVariant, Leistung } from "@/lib/leistungen/types";

interface Props {
  leistung: Leistung;
  cantonVariant?: CantonVariant;
}

export function LeistungsKarte({ leistung, cantonVariant }: Props) {
  const displayAmount = cantonVariant?.amount ?? leistung.amount;
  const displayLink = cantonVariant?.officialLink ?? leistung.officialLink;

  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      aria-labelledby={`leistung-${leistung.slug}`}
    >
      <h3
        id={`leistung-${leistung.slug}`}
        className="text-xl font-semibold text-gray-900"
      >
        {leistung.title}
      </h3>

      {displayAmount ? (
        <p className="mt-2 text-lg font-bold text-[#2F6F4F]">{displayAmount}</p>
      ) : null}

      <p className="mt-3 text-base leading-7 text-gray-700">
        {leistung.longDescription}
      </p>

      {cantonVariant?.note ? (
        <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          {cantonVariant.note}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {leistung.legalSource}
        </span>
        <a
          href={displayLink}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] text-base font-medium text-[#2F6F4F] underline underline-offset-4"
        >
          Zur offiziellen Quelle →
        </a>
      </div>
    </article>
  );
}
