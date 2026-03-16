// lib/__tests__/export.test.ts
// Unit-Tests fuer CSV/XLSX Export-Utilities

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { generateCsv, generateXlsx } from '../export';

describe('generateCsv', () => {
  it('generiert korrekte Header-Zeile', () => {
    const csv = generateCsv(['Name', 'E-Mail', 'Quartier'], []);
    expect(csv).toBe('Name,E-Mail,Quartier');
  });

  it('generiert Header und Datenzeilen', () => {
    const csv = generateCsv(
      ['Name', 'Alter'],
      [['Max Mustermann', '42'], ['Erika Muster', '35']]
    );
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name,Alter');
    expect(lines[1]).toBe('Max Mustermann,42');
    expect(lines[2]).toBe('Erika Muster,35');
  });

  it('escaped Kommas in Werten', () => {
    const csv = generateCsv(
      ['Adresse'],
      [['Purkersdorfer Straße 5, Bad Säckingen']]
    );
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('"Purkersdorfer Straße 5, Bad Säckingen"');
  });

  it('escaped Anfuehrungszeichen in Werten', () => {
    const csv = generateCsv(
      ['Notiz'],
      [['Er sagte "Hallo" und ging']]
    );
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('"Er sagte ""Hallo"" und ging"');
  });

  it('escaped Zeilenumbrueche in Werten', () => {
    const csv = generateCsv(
      ['Beschreibung'],
      [['Zeile 1\nZeile 2']]
    );
    const lines = csv.split('\r\n');
    // Der Wert mit Zeilenumbruch muss in Anfuehrungszeichen stehen
    expect(lines[1]).toBe('"Zeile 1\nZeile 2"');
  });

  it('behandelt leere Werte korrekt', () => {
    const csv = generateCsv(
      ['A', 'B', 'C'],
      [['', 'Wert', '']]
    );
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe(',Wert,');
  });
});

describe('generateXlsx', () => {
  it('erzeugt einen gueltigen XLSX-Buffer', () => {
    const buffer = generateXlsx(
      ['Name', 'Quartier'],
      [['Max Mustermann', 'Oberer Rebberg']]
    );
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('enthaelt die korrekten Daten im Worksheet', () => {
    const headers = ['Name', 'Status', 'Datum'];
    const rows = [
      ['Anna Schmidt', 'good', '2026-03-16'],
      ['Hans Mueller', 'okay', '2026-03-15'],
    ];

    const buffer = generateXlsx(headers, rows);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Erstes Sheet lesen
    const sheetName = workbook.SheetNames[0];
    expect(sheetName).toBe('Export');

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    // Header pruefen
    expect(data[0]).toEqual(headers);
    // Datenzeilen pruefen
    expect(data[1]).toEqual(rows[0]);
    expect(data[2]).toEqual(rows[1]);
  });
});
