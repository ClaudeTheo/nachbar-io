import type { Country } from "@/lib/leistungen/types";

interface Props {
  country: Country;
  lastReviewed: string;
}

export function Haftungsausschluss({ country, lastReviewed }: Props) {
  const verbindlich =
    country === "DE"
      ? "Ihre Pflegekasse"
      : "Ihre Ausgleichskasse oder IV-Stelle";
  const date = new Date(lastReviewed).toLocaleDateString("de-DE");
  return (
    <div
      role="note"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-gray-800"
    >
      <strong>Keine Rechtsberatung.</strong> Alle Angaben ohne Gewähr, Stand{" "}
      {date}. Beträge und Bedingungen ändern sich regelmäßig. Verbindlich sind
      allein <span className="font-medium">{verbindlich}</span> sowie der
      jeweilige Gesetzestext.
    </div>
  );
}
