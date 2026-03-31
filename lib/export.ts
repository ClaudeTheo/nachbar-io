// lib/export.ts
// Nachbar.io — CSV/XLSX Export-Utilities fuer Pro Community Organisationen

import ExcelJS from 'exceljs';

// --- Typen ---

export type ExportFormat = 'csv' | 'xlsx';

export type ExportType = 'quarter_stats' | 'activity_report' | 'escalation_report';

export type ExportRow = Record<string, string | number | boolean | null>;

// --- Deutsche Spaltennamen ---

const QUARTER_STATS_HEADERS: Record<string, string> = {
  snapshot_date: 'Datum',
  wah: 'Aktive Haushalte (WAH)',
  total_users: 'Bewohner gesamt',
  active_users_7d: 'Aktiv (7 Tage)',
  active_users_30d: 'Aktiv (30 Tage)',
  new_registrations: 'Neuregistrierungen',
  activation_rate: 'Aktivierungsrate (%)',
  retention_7d: 'Retention 7d (%)',
  posts_count: 'Beitraege',
  events_count: 'Veranstaltungen',
  heartbeat_coverage: 'Heartbeat-Abdeckung (%)',
  escalation_count: 'Eskalationen',
  plus_subscribers: 'Plus-Abonnenten',
  mrr: 'MRR (EUR)',
};

const ESCALATION_HEADERS: Record<string, string> = {
  created_at: 'Zeitpunkt',
  user_id_anon: 'Nutzer (anonymisiert)',
  level: 'Eskalationsstufe',
  status: 'Status',
  resolved_at: 'Geloest am',
};

function getHeaders(exportType: ExportType): Record<string, string> {
  switch (exportType) {
    case 'quarter_stats':
      return QUARTER_STATS_HEADERS;
    case 'escalation_report':
      return ESCALATION_HEADERS;
    default:
      return {};
  }
}

// Daten mit deutschen Spaltennamen vorbereiten
export function prepareData(rows: ExportRow[], exportType: ExportType): ExportRow[] {
  const headers = getHeaders(exportType);
  return rows.map(row => {
    const mapped: ExportRow = {};
    for (const [key, value] of Object.entries(row)) {
      const label = headers[key] ?? key;
      mapped[label] = value;
    }
    return mapped;
  });
}

// --- Low-Level Basis-Funktionen ---

/**
 * Escaped einen CSV-Wert gemaess RFC 4180
 */
function escapeCsvValue(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Generiert CSV aus Header + Datenzeilen (low-level)
 */
export function generateCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(';');
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(';'));
  // BOM fuer Excel UTF-8-Erkennung
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Generiert XLSX-Buffer aus Header + Datenzeilen (low-level)
 * Verwendet ExcelJS statt xlsx-Paket (sicherheitskritisch)
 */
export async function generateXlsx(headers: string[], rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export');

  // Header-Zeile hinzufuegen
  worksheet.addRow(headers);
  // Datenzeilen hinzufuegen
  for (const row of rows) {
    worksheet.addRow(row);
  }

  // Spaltenbreiten anpassen
  worksheet.columns = headers.map(h => ({ width: Math.max(h.length, 12) }));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// --- High-Level Export-Funktionen ---

/**
 * Generiert CSV aus typisiertem Export (mit deutschen Spaltennamen)
 */
export function generateTypedCsv(rows: ExportRow[], exportType: ExportType): string {
  const prepared = prepareData(rows, exportType);
  if (prepared.length === 0) return '';
  const headers = Object.keys(prepared[0]);
  const dataRows = prepared.map(row =>
    headers.map(h => String(row[h] ?? ''))
  );
  return generateCsv(headers, dataRows);
}

/**
 * Generiert XLSX aus typisiertem Export (mit deutschen Spaltennamen)
 * Verwendet ExcelJS statt xlsx-Paket (sicherheitskritisch)
 */
export async function generateTypedXlsx(rows: ExportRow[], exportType: ExportType, sheetName?: string): Promise<Buffer> {
  const prepared = prepareData(rows, exportType);
  if (prepared.length === 0) {
    return generateXlsx(['Keine Daten'], []);
  }
  const headers = Object.keys(prepared[0]);
  const dataRows = prepared.map(row =>
    headers.map(h => String(row[h] ?? ''))
  );

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName ?? 'Export');

  // Header-Zeile hinzufuegen
  worksheet.addRow(headers);
  // Datenzeilen hinzufuegen
  for (const row of dataRows) {
    worksheet.addRow(row);
  }

  // Spaltenbreiten anpassen
  worksheet.columns = headers.map(h => ({ width: Math.max(h.length, 12) }));

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Export-Dateiname generieren
 */
export function getExportFilename(exportType: ExportType, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  const typeLabel: Record<ExportType, string> = {
    quarter_stats: 'Quartier-Statistiken',
    activity_report: 'Aktivitaets-Report',
    escalation_report: 'Eskalations-Report',
  };
  return `${typeLabel[exportType]}_${date}.${format}`;
}
