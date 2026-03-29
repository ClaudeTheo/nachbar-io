// Nachbar.io — Service: Organisationen (CRUD, Audit-Log, Export)
// Extrahiert aus app/api/organizations/route.ts, audit/route.ts, export/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { validateOrgCreate } from "@/lib/organizations";

// Erlaubte Export-Typen und Formate
const EXPORT_TYPES = ["residents", "alerts", "checkins"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

// --- Organisationen auflisten ---

/**
 * Eigene Organisationen auflisten (via RLS).
 * Admins sehen alle Organisationen.
 */
export async function listOrganizations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*, org_members(id, user_id, role, assigned_quarters)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[organizations] GET Fehler:", error);
    throw new ServiceError("Organisationen konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

// --- Organisation erstellen ---

export interface CreateOrgInput {
  name: string;
  type: string;
  hr_vr_number: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

/**
 * Neue Organisation erstellen.
 * Prueft ob User Plattform-Admin ist, validiert Body, erstellt Org + Audit-Log.
 */
export async function createOrganization(
  supabase: SupabaseClient,
  serviceDb: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  // Nur Plattform-Admins duerfen Organisationen erstellen
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!profile?.is_admin) {
    throw new ServiceError(
      "Nur Plattform-Administratoren duerfen Organisationen erstellen",
      403,
    );
  }

  // Validierung
  const validation = validateOrgCreate(body);
  if (!validation.valid) {
    throw new ServiceError(validation.error ?? "Validierungsfehler", 400);
  }

  // Organisation erstellen (Service-Client fuer INSERT ohne RLS-Policy)
  const { data: org, error: insertError } = await serviceDb
    .from("organizations")
    .insert({
      name: (body.name as string).trim(),
      type: body.type as string,
      hr_vr_number: (body.hr_vr_number as string).trim(),
      contact_email: (body.contact_email as string).trim().toLowerCase(),
      contact_phone: body.contact_phone
        ? (body.contact_phone as string).trim()
        : null,
      address: body.address ? (body.address as string).trim() : null,
      verification_status: "pending",
    })
    .select()
    .single();

  if (insertError || !org) {
    console.error("[organizations] POST Insert-Fehler:", insertError);
    throw new ServiceError("Organisation konnte nicht erstellt werden", 500);
  }

  // Audit-Log: Organisation erstellt
  await serviceDb.from("org_audit_log").insert({
    org_id: org.id,
    user_id: userId,
    action: "org_created",
    details: { name: org.name, type: org.type },
  });

  return org;
}

// --- Audit-Log abrufen ---

/**
 * Audit-Log einer Organisation abrufen (paginiert).
 */
export async function getAuditLog(
  supabase: SupabaseClient,
  orgId: string,
  limit: number,
  offset: number,
) {
  // Limit begrenzen
  const safeLimit = Math.min(limit || 50, 200);
  const safeOffset = offset || 0;

  const { data, error, count } = await supabase
    .from("org_audit_log")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) {
    console.error("[organizations/audit] GET Fehler:", error);
    throw new ServiceError("Audit-Log konnte nicht geladen werden", 500);
  }

  return {
    data: data ?? [],
    total: count ?? 0,
    limit: safeLimit,
    offset: safeOffset,
  };
}

// --- Datenexport ---

/**
 * Laedt Bewohner-Daten fuer den Export (anonymisiert fuer org_viewer).
 */
async function fetchResidents(serviceDb: SupabaseClient, orgId: string) {
  // Quartiere der Organisation ermitteln
  const { data: members } = await serviceDb
    .from("org_members")
    .select("assigned_quarters")
    .eq("org_id", orgId);

  const quarters = (members ?? [])
    .flatMap((m) => m.assigned_quarters ?? [])
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  if (quarters.length === 0) {
    return {
      headers: ["ID", "Name", "Quartier", "Registriert"],
      rows: [] as string[][],
    };
  }

  const { data: residents } = await serviceDb
    .from("users")
    .select("id, display_name, quarter_id, created_at")
    .in("quarter_id", quarters);

  const headers = ["ID", "Name", "Quartier", "Registriert"];
  const rows = (residents ?? []).map((r) => [
    r.id,
    r.display_name ?? "Unbekannt",
    r.quarter_id ?? "",
    r.created_at ? new Date(r.created_at).toLocaleDateString("de-DE") : "",
  ]);

  return { headers, rows };
}

/**
 * Laedt Alert-Daten fuer den Export.
 */
async function fetchAlerts(serviceDb: SupabaseClient, orgId: string) {
  const { data: alerts } = await serviceDb
    .from("emergency_alerts")
    .select("id, category, status, created_at, resolved_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1000);

  const headers = ["ID", "Kategorie", "Status", "Erstellt", "Geloest"];
  const rows = (alerts ?? []).map((a) => [
    a.id,
    a.category ?? "",
    a.status ?? "",
    a.created_at ? new Date(a.created_at).toLocaleDateString("de-DE") : "",
    a.resolved_at ? new Date(a.resolved_at).toLocaleDateString("de-DE") : "",
  ]);

  return { headers, rows };
}

/**
 * Laedt Check-in-Daten fuer den Export (anonymisiert).
 */
async function fetchCheckins(serviceDb: SupabaseClient, orgId: string) {
  // Quartiere der Organisation ermitteln
  const { data: members } = await serviceDb
    .from("org_members")
    .select("assigned_quarters")
    .eq("org_id", orgId);

  const quarters = (members ?? [])
    .flatMap((m) => m.assigned_quarters ?? [])
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  if (quarters.length === 0) {
    return {
      headers: ["Nutzer-ID", "Status", "Zeitpunkt"],
      rows: [] as string[][],
    };
  }

  const { data: checkins } = await serviceDb
    .from("checkins")
    .select("user_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const headers = ["Nutzer-ID", "Status", "Zeitpunkt"];
  const rows = (checkins ?? []).map((c) => [
    c.user_id ?? "",
    c.status ?? "",
    c.created_at ? new Date(c.created_at).toISOString() : "",
  ]);

  return { headers, rows };
}

/**
 * Validiert Export-Parameter und laedt die Daten.
 */
export function validateExportParams(
  format: string | null,
  type: string | null,
): { format: ExportFormat; type: ExportType } {
  if (!format || !EXPORT_FORMATS.includes(format as ExportFormat)) {
    throw new ServiceError("Ungueltiges Format. Erlaubt: csv, xlsx", 400);
  }

  if (!type || !EXPORT_TYPES.includes(type as ExportType)) {
    throw new ServiceError(
      "Ungueltiger Typ. Erlaubt: residents, alerts, checkins",
      400,
    );
  }

  return { format: format as ExportFormat, type: type as ExportType };
}

/**
 * Exportdaten laden (Bewohner, Alerts oder Check-ins).
 */
export async function fetchExportData(
  serviceDb: SupabaseClient,
  orgId: string,
  type: ExportType,
): Promise<{ headers: string[]; rows: string[][] }> {
  try {
    switch (type) {
      case "residents":
        return await fetchResidents(serviceDb, orgId);
      case "alerts":
        return await fetchAlerts(serviceDb, orgId);
      case "checkins":
        return await fetchCheckins(serviceDb, orgId);
    }
  } catch (error) {
    console.error(
      `[organizations/export] Fehler beim Laden von ${type}:`,
      error,
    );
    throw new ServiceError("Daten konnten nicht geladen werden", 500);
  }
}

/**
 * Generiert den Dateinamen fuer den Export.
 */
export function generateExportFilename(
  type: ExportType,
  format: ExportFormat,
): string {
  const dateStr = new Date().toISOString().split("T")[0];
  return `nachbar_${type}_${dateStr}.${format}`;
}
