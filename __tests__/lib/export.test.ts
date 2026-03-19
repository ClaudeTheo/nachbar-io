import { describe, it, expect } from 'vitest';
import {
  generateCsv,
  generateXlsx,
  generateTypedCsv,
  generateTypedXlsx,
  getExportFilename,
  prepareData,
  type ExportRow,
} from '@/lib/export';

describe('generateCsv', () => {
  it('erzeugt CSV mit Semikolon-Trennung und BOM', () => {
    const headers = ['Name', 'Alter'];
    const rows = [['Max', '30'], ['Anna', '25']];
    const csv = generateCsv(headers, rows);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Name;Alter');
    expect(csv).toContain('Max;30');
  });

  it('escaped Semikolons in Werten', () => {
    const csv = generateCsv(['Text'], [['Hallo; Welt']]);
    expect(csv).toContain('"Hallo; Welt"');
  });

  it('escaped Anfuehrungszeichen', () => {
    const csv = generateCsv(['Text'], [['Er sagte "Hallo"']]);
    expect(csv).toContain('"Er sagte ""Hallo"""');
  });
});

describe('generateXlsx', () => {
  it('erzeugt gueltigen XLSX-Buffer', () => {
    const headers = ['Name', 'Wert'];
    const rows = [['Test', '42']];
    const buffer = generateXlsx(headers, rows);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // XLSX Magic Bytes (PK = ZIP)
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });
});

describe('prepareData', () => {
  it('mappt Spaltennamen fuer quarter_stats', () => {
    const rows: ExportRow[] = [
      { snapshot_date: '2026-03-18', wah: 20, total_users: 45 },
    ];
    const prepared = prepareData(rows, 'quarter_stats');
    expect(prepared[0]).toHaveProperty('Datum', '2026-03-18');
    expect(prepared[0]).toHaveProperty('Aktive Haushalte (WAH)', 20);
    expect(prepared[0]).toHaveProperty('Bewohner gesamt', 45);
  });

  it('behaelt unbekannte Spalten bei', () => {
    const rows: ExportRow[] = [{ custom_field: 'test' }];
    const prepared = prepareData(rows, 'quarter_stats');
    expect(prepared[0]).toHaveProperty('custom_field', 'test');
  });
});

describe('generateTypedCsv', () => {
  it('gibt leeren String bei leeren Daten', () => {
    expect(generateTypedCsv([], 'quarter_stats')).toBe('');
  });

  it('erzeugt CSV mit deutschen Spaltennamen', () => {
    const rows: ExportRow[] = [
      { snapshot_date: '2026-03-18', wah: 20, total_users: 45, posts_count: 15 },
    ];
    const csv = generateTypedCsv(rows, 'quarter_stats');
    expect(csv).toContain('Datum');
    expect(csv).toContain('Aktive Haushalte (WAH)');
    expect(csv).toContain('Bewohner gesamt');
    expect(csv).toContain('Beitraege');
  });
});

describe('generateTypedXlsx', () => {
  it('erzeugt gueltigen XLSX-Buffer', () => {
    const rows: ExportRow[] = [
      { snapshot_date: '2026-03-18', wah: 20 },
    ];
    const buffer = generateTypedXlsx(rows, 'quarter_stats');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer[0]).toBe(0x50);
  });

  it('erzeugt Fallback bei leeren Daten', () => {
    const buffer = generateTypedXlsx([], 'quarter_stats');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('getExportFilename', () => {
  it('erzeugt korrekten Dateinamen', () => {
    const fn = getExportFilename('quarter_stats', 'csv');
    expect(fn).toMatch(/Quartier-Statistiken_\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('erzeugt XLSX-Dateinamen', () => {
    const fn = getExportFilename('escalation_report', 'xlsx');
    expect(fn).toMatch(/Eskalations-Report_\d{4}-\d{2}-\d{2}\.xlsx/);
  });
});
