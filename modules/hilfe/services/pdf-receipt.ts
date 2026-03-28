// lib/hilfe/pdf-receipt.ts
// Nachbar Hilfe — PDF-Quittung fuer §45b SGB XI Abrechnung

import { jsPDF } from 'jspdf';
import { HELP_CATEGORY_LABELS, type HelpCategory } from './types';

export interface ReceiptData {
  resident: {
    name: string;
    address: string;
    insurance_name: string;
    insurance_number: string;
    care_level: number;
  };
  helper: {
    name: string;
    address: string;
    date_of_birth: string;
  };
  session: {
    session_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    activity_category: string;
    activity_description: string | null;
    hourly_rate_cents: number;
    total_amount_cents: number;
  };
  signatures: {
    helper: string;
    resident: string;
  };
}

/** Cent-Betrag als "15,00 EUR" formatieren */
export function formatCents(cents: number): string {
  const euros = (cents / 100).toFixed(2).replace('.', ',');
  return `${euros} EUR`;
}

/** ISO-Datum als "25.03.2026" formatieren */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Kategorie-Label ermitteln (Fallback: Rohwert) */
function getCategoryLabel(category: string): string {
  return HELP_CATEGORY_LABELS[category as HelpCategory] ?? category;
}

/**
 * Generiert eine 2-seitige PDF-Quittung gemaess §45b SGB XI.
 * Seite 1: Abrechnungsformular mit Leistungsnachweis
 * Seite 2: Bestaetigung der Rahmenbedingungen durch den Helfer
 */
export function generateReceipt(data: ReceiptData): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // --- Seite 1: Abrechnungsformular ---

  // Titel
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const title = 'Abrechnung der Unterstuetzungsleistung';
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('nach §45b Abs. 1 Satz 3 Nr. 4 SGB XI', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Trennlinie
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Bewohner-Datenblock ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Angaben zur pflegebeduerftigen Person', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const residentFields = [
    ['Name:', data.resident.name],
    ['Adresse:', data.resident.address],
    ['Pflegekasse:', data.resident.insurance_name],
    ['Versichertennummer:', data.resident.insurance_number],
    ['Pflegegrad:', String(data.resident.care_level)],
  ];

  for (const [label, value] of residentFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, y);
    y += 5;
  }
  y += 5;

  // --- Helfer-Datenblock ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Angaben zur Nachbarschaftshelferin / zum Nachbarschaftshelfer', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const helperFields = [
    ['Name:', data.helper.name],
    ['Adresse:', data.helper.address],
    ['Geburtsdatum:', formatDate(data.helper.date_of_birth)],
  ];

  for (const [label, value] of helperFields) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, y);
    y += 5;
  }
  y += 8;

  // --- Leistungstabelle ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Erbrachte Leistung', margin, y);
  y += 6;

  // Tabellen-Header
  const colX = [margin, margin + 25, margin + 55, margin + 75, margin + 115];
  const colHeaders = ['Datum', 'Uhrzeit', 'Dauer', 'Taetigkeit', 'Betrag'];

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 3.5, contentWidth, 5, 'F');
  colHeaders.forEach((header, i) => {
    doc.text(header, colX[i], y);
  });
  y += 6;

  // Tabellen-Zeile
  doc.setFont('helvetica', 'normal');
  const categoryLabel = getCategoryLabel(data.session.activity_category);
  const activityText = data.session.activity_description
    ? `${categoryLabel}: ${data.session.activity_description}`
    : categoryLabel;

  doc.text(formatDate(data.session.session_date), colX[0], y);
  doc.text(`${data.session.start_time} - ${data.session.end_time}`, colX[1], y);
  doc.text(`${data.session.duration_minutes} Min.`, colX[2], y);

  // Taetigkeit ggf. umbrechen
  const activityLines = doc.splitTextToSize(activityText, 38);
  doc.text(activityLines, colX[3], y);
  doc.text(formatCents(data.session.total_amount_cents), colX[4], y);

  const lineCount = Array.isArray(activityLines) ? activityLines.length : 1;
  y += Math.max(lineCount * 4, 5) + 4;

  // Trennlinie
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Gesamtsumme
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Gesamtsumme:', margin + 75, y);
  doc.text(formatCents(data.session.total_amount_cents), margin + 115, y);
  y += 3;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  y += 4;
  doc.text(
    `(Stundensatz: ${formatCents(data.session.hourly_rate_cents)}/Std.)`,
    margin + 75, y,
  );
  y += 15;

  // --- Unterschriften ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Unterschriften', margin, y);
  y += 8;

  // Digitale Signaturen als Bild einbetten (Base64 Data-URIs)
  const sigWidth = 50;
  const sigHeight = 20;

  if (data.signatures.helper) {
    try {
      doc.addImage(data.signatures.helper, 'PNG', margin, y, sigWidth, sigHeight);
    } catch {
      // Signatur-Bild ungueltig — Fallback auf leere Linie
    }
  }

  if (data.signatures.resident) {
    try {
      doc.addImage(data.signatures.resident, 'PNG', margin + 80, y, sigWidth, sigHeight);
    } catch {
      // Signatur-Bild ungueltig — Fallback auf leere Linie
    }
  }

  y += sigHeight + 2;

  // Unterschriftslinien als Druck-Fallback
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + sigWidth, y);
  doc.line(margin + 80, y, margin + 80 + sigWidth, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Nachbarschaftshelfer/in', margin, y);
  doc.text('Pflegebeduerftiger/Bevollmaechtigter', margin + 80, y);

  // --- Seite 2: Bestaetigung Rahmenbedingungen ---
  doc.addPage();
  y = 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bestaetigung der Rahmenbedingungen', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('gemaess §45a SGB XI', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Erklaerungstext
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const introText = `Ich, ${data.helper.name}, bestaetige hiermit folgende Rahmenbedingungen fuer die erbrachte Unterstuetzungsleistung:`;
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 8;

  // Bestaetigungspunkte
  const confirmations = [
    'Ich bin mindestens 16 Jahre alt.',
    'Ich bin mit der pflegebeduerfigen Person nicht bis zum 2. Grad verwandt oder verschwaegert.',
    'Ich lebe nicht mit der pflegebeduerfigen Person in einem gemeinsamen Haushalt.',
    'Ich erfuelle die Voraussetzungen nach §45a SGB XI fuer Nachbarschaftshilfe im jeweiligen Bundesland.',
    'Die oben aufgefuehrte Leistung wurde tatsaechlich und persoenlich von mir erbracht.',
  ];

  doc.setFontSize(9);
  for (const point of confirmations) {
    // Checkbox-Symbol
    doc.setFont('helvetica', 'bold');
    doc.text('[X]', margin, y);
    doc.setFont('helvetica', 'normal');
    const pointLines = doc.splitTextToSize(point, contentWidth - 12);
    doc.text(pointLines, margin + 12, y);
    y += pointLines.length * 4.5 + 4;
  }

  y += 10;

  // Datum
  doc.setFontSize(9);
  doc.text(`Datum: ${formatDate(data.session.session_date)}`, margin, y);
  y += 12;

  // Helfer-Signatur
  if (data.signatures.helper) {
    try {
      doc.addImage(data.signatures.helper, 'PNG', margin, y, sigWidth, sigHeight);
    } catch {
      // Signatur-Bild ungueltig
    }
  }

  y += sigHeight + 2;

  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + sigWidth, y);
  y += 4;
  doc.setFontSize(8);
  doc.text('Unterschrift Nachbarschaftshelfer/in', margin, y);

  // Fusszeile auf beiden Seiten
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(
      `Erstellt mit nachbar.io — Seite ${i} von ${pageCount}`,
      pageWidth / 2, 287,
      { align: 'center' },
    );
    doc.setTextColor(0);
  }

  // PDF als Uint8Array zurueckgeben
  return new Uint8Array(doc.output('arraybuffer'));
}
