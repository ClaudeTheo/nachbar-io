// Nachbar Hilfe — CSV-Export fuer Jahresabrechnung (ELSTER/Excel-DE-kompatibel)

export interface HelperCsvRow {
  date: string; // ISO format
  clientName: string; // DSGVO: "Maria S."
  category: string;
  durationMinutes: number;
  hourlyRateEur: string; // "15,00"
  amountEur: string; // "15,00"
}

export interface ResidentCsvRow {
  date: string;
  helperName: string;
  helperAddress: string;
  category: string;
  durationMinutes: number;
  hourlyRateEur: string;
  amountEur: string;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const BOM = "\uFEFF";

export function generateHelperCsv(rows: HelperCsvRow[]): string {
  const header = "Datum;Klient;Kategorie;Dauer_Min;Stundensatz_EUR;Betrag_EUR";
  const lines = rows.map(
    (r) =>
      `${formatDate(r.date)};${r.clientName};${r.category};${r.durationMinutes};${r.hourlyRateEur};${r.amountEur}`,
  );
  return BOM + [header, ...lines].join("\n");
}

export function generateResidentCsv(rows: ResidentCsvRow[]): string {
  const header =
    "Datum;Helfer;Helfer_Adresse;Kategorie;Dauer_Min;Stundensatz_EUR;Betrag_EUR";
  const lines = rows.map(
    (r) =>
      `${formatDate(r.date)};${r.helperName};${r.helperAddress};${r.category};${r.durationMinutes};${r.hourlyRateEur};${r.amountEur}`,
  );
  return BOM + [header, ...lines].join("\n");
}
