import Link from "next/link";

interface AttributionFooterProps {
  attributionText: string;
}

export function AttributionFooter({
  attributionText,
}: AttributionFooterProps) {
  return (
    <div className="mt-4 border-t border-amber-200/80 pt-3 text-sm leading-5 text-amber-950/85">
      <p>{attributionText}</p>
      <Link
        href="/datenquellen"
        className="mt-1 inline-flex items-center gap-1 font-medium text-amber-900 underline underline-offset-4"
      >
        Mehr zu Datenquellen
      </Link>
    </div>
  );
}
