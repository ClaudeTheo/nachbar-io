// lib/export.ts
// Nachbar.io — CSV/XLSX Export-Utilities fuer Pro Community Organisationen

import * as XLSX from 'xlsx';

/**
 * Escaped einen CSV-Wert gemaess RFC 4180:
 * - Werte mit Komma, Anfuehrungszeichen oder Zeilenumbruch werden in Anfuehrungszeichen gesetzt
 * - Anfuehrungszeichen innerhalb des Werts werden verdoppelt
 */
function escapeCsvValue(value: string): string {
  // Wenn Komma, Anfuehrungszeichen oder Zeilenumbruch enthalten → quoten
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Generiert einen CSV-String aus Header-Zeile und Datenzeilen.
 * Verwendet RFC 4180 konformes Escaping.
 */
export function generateCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Generiert einen XLSX-Buffer aus Header-Zeile und Datenzeilen.
 * Verwendet die xlsx-Bibliothek fuer korrektes Excel-Format.
 */
export function generateXlsx(headers: string[], rows: string[][]): Buffer {
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

  // Buffer fuer Node.js erzeugen
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}
