// lib/__tests__/export.test.ts
// Unit-Tests fuer CSV/XLSX Export-Utilities

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { generateCsv, generateXlsx } from '../export';

// BOM-Prefix fuer Excel UTF-8
const BOM = '\uFEFF';

describe('generateCsv', () => {
  it('generiert korrekte Header-Zeile mit BOM und Semikolon', () => {
    const csv = generateCsv(['Name', 'E-Mail', 'Quartier'], []);
    expect(csv).toBe(`${BOM}Name;E-Mail;Quartier`);
  });

  it('generiert Header und Datenzeilen', () => {
    const csv = generateCsv(
      ['Name', 'Alter'],
      [['Max Mustermann', '42'], ['Erika Muster', '35']]
    );
    const lines = csv.replace(BOM, '').split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name;Alter');
    expect(lines[1]).toBe('Max Mustermann;42');
    expect(lines[2]).toBe('Erika Muster;35');
  });

  it('escaped Semikolons in Werten', () => {
    const csv = generateCsv(
      ['Adresse'],
      [['Purkersdorfer Strasse 5; Bad Saeckingen']]
    );
    const lines = csv.replace(BOM, '').split('\r\n');
    expect(lines[1]).toBe('"Purkersdorfer Strasse 5; Bad Saeckingen"');
  });

  it('escaped Anfuehrungszeichen in Werten', () => {
    const csv = generateCsv(
      ['Notiz'],
      [['Er sagte "Hallo" und ging']]
    );
    const lines = csv.replace(BOM, '').split('\r\n');
    expect(lines[1]).toBe('"Er sagte ""Hallo"" und ging"');
  });

  it('escaped Zeilenumbrueche in Werten', () => {
    const csv = generateCsv(
      ['Beschreibung'],
      [['Zeile 1\nZeile 2']]
    );
    const lines = csv.replace(BOM, '').split('\r\n');
    expect(lines[1]).toBe('"Zeile 1\nZeile 2"');
  });

  it('behandelt leere Werte korrekt', () => {
    const csv = generateCsv(
      ['A', 'B', 'C'],
      [['', 'Wert', '']]
    );
    const lines = csv.replace(BOM, '').split('\r\n');
    expect(lines[1]).toBe(';Wert;');
  });
});

describe('generateXlsx', () => {
  it('erzeugt einen gueltigen XLSX-Buffer', async () => {
    const buffer = await generateXlsx(
      ['Name', 'Quartier'],
      [['Max Mustermann', 'Oberer Rebberg']]
    );
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('enthaelt die korrekten Daten im Worksheet', async () => {
    const headers = ['Name', 'Status', 'Datum'];
    const rows = [
      ['Anna Schmidt', 'good', '2026-03-16'],
      ['Hans Mueller', 'okay', '2026-03-15'],
    ];

    const buffer = await generateXlsx(headers, rows);

    // XLSX mit ExcelJS zuruecklesen und pruefen
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    // Erstes Sheet lesen
    const worksheet = workbook.worksheets[0];
    expect(worksheet.name).toBe('Export');

    // Header pruefen (Zeile 1)
    const headerRow = worksheet.getRow(1).values as (string | undefined)[];
    // ExcelJS Rows sind 1-basiert, Index 0 ist undefined
    expect(headerRow.slice(1)).toEqual(headers);

    // Datenzeilen pruefen
    const row1 = worksheet.getRow(2).values as (string | undefined)[];
    expect(row1.slice(1)).toEqual(rows[0]);
    const row2 = worksheet.getRow(3).values as (string | undefined)[];
    expect(row2.slice(1)).toEqual(rows[1]);
  });
});
