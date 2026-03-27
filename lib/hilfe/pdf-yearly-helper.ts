// Nachbar Hilfe — Jahresabrechnung Helfer-PDF
// Erstellt eine jaehrliche Einnahmen-Uebersicht fuer das Finanzamt.
import { jsPDF } from "jspdf";

export interface YearlyHelperSession {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
  amountCents: number;
}

export interface YearlyHelperClient {
  displayName: string; // DSGVO: nur "Maria S." Format
  sessions: YearlyHelperSession[];
  subtotalCents: number;
}

export interface YearlyHelperData {
  year: number;
  helper: {
    name: string;
    address: string;
    dateOfBirth: string;
    federalState: string;
  };
  clients: YearlyHelperClient[];
  totalAmountCents: number;
  totalSessions: number;
  totalClients: number;
  averageHourlyRateCents: number;
  taxNote: string;
  exceedsFreibetrag: boolean;
}

function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${euros},${rest.toString().padStart(2, "0")} EUR`;
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

const FEDERAL_STATE_NAMES: Record<string, string> = {
  BW: "Baden-Wuerttemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thueringen",
};

export function generateYearlyHelperReport(data: YearlyHelperData): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;
  let pageNumber = 1;

  // --- Hilfsfunktion: Seitenumbruch pruefen ---
  function checkPageBreak(needed: number): void {
    if (y + needed > 260) {
      addFooter();
      doc.addPage();
      pageNumber++;
      y = 20;
    }
  }

  // --- Footer auf aktuelle Seite setzen ---
  function addFooter(): void {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Erstellt mit nachbar.io — Keine Rechtsberatung — Seite ${pageNumber}`,
      margin,
      287,
    );
    doc.setTextColor(0, 0, 0);
  }

  // === TITEL ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(45, 49, 66); // Anthrazit
  doc.text(`Jahresabrechnung Nachbarschaftshilfe ${data.year}`, margin, y);
  y += 7;

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Einnahmen-Uebersicht fuer das Finanzamt", margin, y);
  y += 4;

  // Gruene Trennlinie
  doc.setDrawColor(76, 175, 135); // Quartier-Gruen
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 10;

  // === HELFER-DATEN ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Angaben zur Person:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${data.helper.name}`, margin, y);
  y += 5;
  doc.text(`Anschrift: ${data.helper.address}`, margin, y);
  y += 5;
  doc.text(`Geburtsdatum: ${formatDate(data.helper.dateOfBirth)}`, margin, y);
  y += 5;
  const stateName =
    FEDERAL_STATE_NAMES[data.helper.federalState] || data.helper.federalState;
  doc.text(`Bundesland: ${stateName}`, margin, y);
  y += 10;

  // === PRO-CLIENT TABELLEN ===
  for (const client of data.clients) {
    // Pruefen ob genug Platz fuer Header + mind. 1 Zeile
    checkPageBreak(30);

    // Client-Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 49, 66);
    doc.text(`Einsaetze fuer: ${client.displayName}`, margin, y);
    y += 6;

    // Tabellen-Header
    const colX = [
      margin,
      margin + 25,
      margin + 55,
      margin + 80,
      margin + 115,
      margin + 145,
    ];
    doc.setFontSize(9);
    doc.setFillColor(45, 49, 66); // Anthrazit
    doc.rect(margin, y - 4, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Datum", colX[0] + 1, y);
    doc.text("Uhrzeit", colX[1] + 1, y);
    doc.text("Dauer", colX[2] + 1, y);
    doc.text("Taetigkeit", colX[3] + 1, y);
    doc.text("Betrag", colX[4] + 1, y);
    y += 5;
    doc.setTextColor(0, 0, 0);

    // Tabellen-Zeilen
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < client.sessions.length; i++) {
      const s = client.sessions[i];
      checkPageBreak(8);
      if (i % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, contentWidth, 6, "F");
      }
      doc.text(formatDate(s.date), colX[0] + 1, y);
      doc.text(`${s.startTime}–${s.endTime}`, colX[1] + 1, y);
      doc.text(`${s.durationMinutes} Min.`, colX[2] + 1, y);
      doc.text(s.category.substring(0, 20), colX[3] + 1, y);
      doc.text(formatCents(s.amountCents), colX[4] + 1, y);
      y += 6;
    }

    // Subtotal pro Client
    y += 2;
    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `Zwischensumme ${client.displayName}: ${client.sessions.length} Einsaetze`,
      margin,
      y,
    );
    doc.text(formatCents(client.subtotalCents), colX[4] + 1, y);
    y += 10;
  }

  // === ZUSAMMENFASSUNG ===
  checkPageBreak(40);
  doc.setDrawColor(76, 175, 135);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(45, 49, 66);
  doc.text("Zusammenfassung", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  doc.text("Gesamteinnahmen:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatCents(data.totalAmountCents), margin + 60, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text("Anzahl Einsaetze:", margin, y);
  doc.text(`${data.totalSessions}`, margin + 60, y);
  y += 6;

  doc.text("Betreute Personen:", margin, y);
  doc.text(`${data.totalClients}`, margin + 60, y);
  y += 6;

  doc.text("Durchschn. Stundensatz:", margin, y);
  doc.text(formatCents(data.averageHourlyRateCents), margin + 60, y);
  y += 10;

  // === STEUER-HINWEIS ===
  checkPageBreak(25);

  if (data.exceedsFreibetrag) {
    // Roter Warnhinweis
    doc.setFillColor(254, 226, 226); // Helles Rot
    doc.setDrawColor(239, 68, 68); // Rot
    doc.setLineWidth(0.5);
    doc.rect(margin, y - 4, contentWidth, 14, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(
      "Achtung: Der Freibetrag wurde ueberschritten!",
      margin + 3,
      y + 1,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(data.taxNote, margin + 3, y + 7, {
      maxWidth: contentWidth - 6,
    });
    y += 16;
  } else {
    // Gruener Steuer-Hinweis
    doc.setFillColor(220, 252, 231); // Helles Gruen
    doc.setDrawColor(76, 175, 135); // Quartier-Gruen
    doc.setLineWidth(0.5);
    doc.rect(margin, y - 4, contentWidth, 12, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text(data.taxNote, margin + 3, y + 2, {
      maxWidth: contentWidth - 6,
    });
    y += 14;
  }

  // === FOOTER (letzte Seite) ===
  doc.setTextColor(0, 0, 0);
  addFooter();

  // Seitenzahlen nachtraeglich korrigieren: "Seite X von Y"
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Bestehenden Footer ueberschreiben
    doc.setFillColor(255, 255, 255);
    doc.rect(margin - 1, 284, contentWidth + 2, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Erstellt mit nachbar.io — Keine Rechtsberatung — Seite ${p} von ${totalPages}`,
      margin,
      287,
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
