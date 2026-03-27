// Nachbar Hilfe — Jahresabrechnung Pflegebeduerftiger (Ausgaben-PDF)
// Erstellt eine jaehrliche Ausgaben-Uebersicht fuer die Steuererklaerung (§ 35a EStG).
import { jsPDF } from "jspdf";

export interface YearlyResidentSession {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
  hourlyRateCents: number;
  amountCents: number;
}

export interface YearlyResidentHelper {
  name: string;
  address: string;
  sessions: YearlyResidentSession[];
  subtotalCents: number;
}

export interface YearlyResidentData {
  year: number;
  resident: {
    name: string;
    address: string;
    insuranceName: string;
    insuranceNumberMasked: string;
    careLevel: number;
  };
  helpers: YearlyResidentHelper[];
  totalAmountCents: number;
  totalSessions: number;
  deductibleAmount: string;
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

export function generateYearlyResidentReport(
  data: YearlyResidentData,
): Uint8Array {
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
  doc.text(`Jahresabrechnung Entlastungsleistungen ${data.year}`, margin, y);
  y += 7;

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Ausgaben-Uebersicht fuer die Steuererklaerung", margin, y);
  y += 4;

  // Gruene Trennlinie
  doc.setDrawColor(76, 175, 135); // Quartier-Gruen
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 10;

  // === BEWOHNER-DATEN ===
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Angaben zum Pflegebeduerftigen:", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${data.resident.name}`, margin, y);
  y += 5;
  doc.text(`Anschrift: ${data.resident.address}`, margin, y);
  y += 5;
  doc.text(`Pflegekasse: ${data.resident.insuranceName}`, margin, y);
  y += 5;
  doc.text(
    `Versichertennummer: ${data.resident.insuranceNumberMasked}`,
    margin,
    y,
  );
  y += 5;
  doc.text(`Pflegegrad: ${data.resident.careLevel}`, margin, y);
  y += 10;

  // === PRO-HELFER TABELLEN ===
  for (const helper of data.helpers) {
    // Pruefen ob genug Platz fuer Header + mind. 1 Zeile
    checkPageBreak(35);

    // Helfer-Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(45, 49, 66);
    doc.text(`Helfer: ${helper.name}`, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Anschrift: ${helper.address}`, margin, y);
    y += 6;

    // Tabellen-Header
    const colX = [
      margin,
      margin + 25,
      margin + 55,
      margin + 80,
      margin + 110,
      margin + 135,
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
    doc.text("Satz/Std.", colX[4] + 1, y);
    doc.text("Betrag", colX[5] + 1, y);
    y += 5;
    doc.setTextColor(0, 0, 0);

    // Tabellen-Zeilen
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < helper.sessions.length; i++) {
      const s = helper.sessions[i];
      checkPageBreak(8);
      if (i % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, contentWidth, 6, "F");
      }
      doc.text(formatDate(s.date), colX[0] + 1, y);
      doc.text(`${s.startTime}–${s.endTime}`, colX[1] + 1, y);
      doc.text(`${s.durationMinutes} Min.`, colX[2] + 1, y);
      doc.text(s.category.substring(0, 18), colX[3] + 1, y);
      doc.text(formatCents(s.hourlyRateCents), colX[4] + 1, y);
      doc.text(formatCents(s.amountCents), colX[5] + 1, y);
      y += 6;
    }

    // Subtotal pro Helfer
    y += 2;
    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `Zwischensumme ${helper.name}: ${helper.sessions.length} Einsaetze`,
      margin,
      y,
    );
    doc.text(formatCents(helper.subtotalCents), colX[5] + 1, y);
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

  doc.text("Gesamtausgaben:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatCents(data.totalAmountCents), margin + 60, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text("Anzahl Einsaetze:", margin, y);
  doc.text(`${data.totalSessions}`, margin + 60, y);
  y += 10;

  // === STEUER-HINWEIS (§ 35a EStG) ===
  checkPageBreak(25);

  doc.setFillColor(220, 252, 231); // Helles Gruen
  doc.setDrawColor(76, 175, 135); // Quartier-Gruen
  doc.setLineWidth(0.5);
  doc.rect(margin, y - 4, contentWidth, 18, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text(
    "Haushaltsnahe Dienstleistungen nach § 35a EStG:",
    margin + 3,
    y + 1,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("20% absetzbar, max. 4.000 EUR/Jahr", margin + 3, y + 6);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Absetzbarer Betrag: ${data.deductibleAmount} EUR`,
    margin + 3,
    y + 11,
  );
  y += 20;

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
