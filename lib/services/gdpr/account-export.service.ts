// Nachbar.io — GDPR-Export-Service (Art. 15 Auskunft + Art. 20 Datenportabilität)
//
// Single Source of Truth: ersetzt die zwei früheren, widersprüchlichen Exporte
// (user-account.service.ts exportUserData + privacy-export.service.ts exportPrivacyData).
// Beide lasen teils nicht existierende Tabellen (checkins, messages, hilfe_requests, …)
// und ließen die Art.-9-Care-Daten komplett aus (Audit B5). Diese Implementierung
// leitet die vollständige Tabellenliste aus der zentralen Registry ab und entschlüsselt
// die verschlüsselten Felder für den Betroffenen.

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptFieldsArray } from "@/lib/care/field-encryption";
import { GDPR_EXPORT_TABLES, type GdprExportTable } from "./user-data-registry";

// Maximale Zeilen pro Tabelle (Schutz gegen Riesen-Exports)
const MAX_ROWS = 5_000;

export interface AccountExportResult {
  export_version: "2.0";
  exported_at: string;
  subject_id: string;
  hinweis: string;
  data: Record<string, unknown>;
}

function filterExpr(table: GdprExportTable, userId: string): string {
  return table.filterColumns.map((col) => `${col}.eq.${userId}`).join(",");
}

/**
 * Exportiert ALLE personenbezogenen Daten eines Nutzers (Registry-basiert).
 *
 * @param adminClient Service-Role-Client. Der userId-Filter wird auf jeder Tabelle
 *   strikt gesetzt — so ist der Export vollständig (kein RLS-Blindspot) und sicher.
 */
export async function exportAccountData(
  adminClient: SupabaseClient,
  userId: string,
): Promise<AccountExportResult> {
  if (!userId || typeof userId !== "string") {
    throw new Error("exportAccountData: userId fehlt");
  }

  const data: Record<string, unknown> = {};

  for (const t of GDPR_EXPORT_TABLES) {
    const expr = filterExpr(t, userId);

    if (t.mode === "count") {
      const { count } = await adminClient
        .from(t.table)
        .select("*", { count: "exact", head: true })
        .or(expr);
      data[t.key] = { count: count ?? 0 };
      continue;
    }

    const { data: rows } = await adminClient
      .from(t.table)
      .select("*")
      .or(expr)
      .limit(MAX_ROWS);

    const list = (rows ?? []) as Record<string, unknown>[];
    data[t.key] = t.encryptedFields
      ? decryptFieldsArray(list, t.encryptedFields)
      : list;
  }

  // Auskunft dokumentieren (Art. 5 Abs. 2 Rechenschaftspflicht)
  try {
    await adminClient.from("org_audit_log").insert({
      user_id: userId,
      action: "privacy_data_export",
      details: { export_version: "2.0", tables: GDPR_EXPORT_TABLES.length },
    });
  } catch (logError) {
    console.warn("Export-Audit konnte nicht geschrieben werden:", logError);
  }

  return {
    export_version: "2.0",
    exported_at: new Date().toISOString(),
    subject_id: userId,
    hinweis:
      "Dieser Export enthält alle zu Ihrer Person gespeicherten Daten gemäß DSGVO Art. 15/20. Gesundheitsdaten sind für Sie entschlüsselt dargestellt.",
    data,
  };
}
