// Nachbar Hilfe — Sammelabrechnung PDF (Monatliche Zusammenfassung)
// Erstellt ein pflegekassenkonformes Sammel-PDF mit allen Einsaetzen eines Monats.
import { jsPDF } from "jspdf";

export interface MonthlyReportSession {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
  amountCents: number;
}

export interface MonthlyReportData {
  helperName: string;
  helperAddress: string;
  seniorName: string;
  seniorAddress: string;
  insuranceName: string;
  insuranceNumber: string;
  careLevel: number;
  monthYear: string; // '2026-03'
  sessions: MonthlyReportSession[];
  totalAmountCents: number;
  hourlyRateCents: number;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Januar",
  "02": "Februar",
  "03": "Maerz",
  "04": "April",
  "05": "Mai",
  "06": "Juni",
  "07": "Juli",
  "08": "August",
  "09": "September",
  "10": "Oktober",
  "11": "November",
  "12": "Dezember",
};

function formatCents(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${euros},${rest.toString().padStart(2, "0")} EUR`;
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

function getMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-");
  return `${MONTH_NAMES[month] || month} ${year}`;
}

export function generateMonthlyReport(data: MonthlyReportData): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Titel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Sammelabrechnung Nachbarschaftshilfe", margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`${getMonthLabel(data.monthYear)}`, margin, y);
  y += 4;

  doc.setDrawColor(76, 175, 135); // Quartier-Gruen
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 10;

  // Abrechnungsdaten
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Angaben zum Pflegebeduerftigen:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${data.seniorName}`, margin, y);
  y += 5;
  doc.text(`Anschrift: ${data.seniorAddress}`, margin, y);
  y += 5;
  doc.text(`Pflegekasse: ${data.insuranceName}`, margin, y);
  y += 5;
  doc.text(`Versichertennummer: ${data.insuranceNumber}`, margin, y);
  y += 5;
  doc.text(`Pflegegrad: ${data.careLevel}`, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Angaben zur Nachbarschaftshilfe:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${data.helperName}`, margin, y);
  y += 5;
  doc.text(`Anschrift: ${data.helperAddress}`, margin, y);
  y += 5;
  doc.text(`Stundensatz: ${formatCents(data.hourlyRateCents)}`, margin, y);
  y += 10;

  // Tabelle Einsaetze
  doc.setFont("helvetica", "bold");
  doc.text("Uebersicht der Einsaetze:", margin, y);
  y += 6;

  // Tabellen-Header
  const colX = [
    margin,
    margin + 25,
    margin + 55,
    margin + 80,
    margin + 110,
    margin + 145,
  ];
  doc.setFontSize(9);
  doc.setFillColor(45, 49, 66); // Anthrazit
  doc.rect(margin, y - 4, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("Datum", colX[0] + 1, y);
  doc.text("Uhrzeit", colX[1] + 1, y);
  doc.text("Dauer", colX[2] + 1, y);
  doc.text("Taetigkeit", colX[3] + 1, y);
  doc.text("Betrag", colX[4] + 1, y);
  y += 5;
  doc.setTextColor(0, 0, 0);

  // Tabellen-Zeilen
  doc.setFont("helvetica", "normal");
  for (let i = 0; i < data.sessions.length; i++) {
    const s = data.sessions[i];
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
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

  // Summe
  y += 3;
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Gesamt: ${data.sessions.length} Einsaetze`, margin, y);
  doc.text(formatCents(data.totalAmountCents), colX[4] + 1, y);
  y += 10;

  // Hinweis
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Erstattung gemaess §45b SGB XI (Entlastungsbetrag 131 EUR/Monat). Allgemeine Informationen, keine Rechtsberatung.",
    margin,
    y,
    { maxWidth: contentWidth },
  );
  y += 8;
  doc.text("Erstellt mit nachbar.io", margin, y);

  // Footer
  doc.setFontSize(7);
  doc.text(
    `Seite 1 | Sammelabrechnung ${getMonthLabel(data.monthYear)} | ${data.helperName} fuer ${data.seniorName}`,
    margin,
    287,
  );

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
