// Nachbar.io — Gemeinsamer Supabase Admin Helper fuer E2E-Tests
// Wird von db-seeder.ts und phase-e-escalation.spec.ts genutzt.
// Bypasst RLS via Service Role Key — NUR fuer Tests verwenden!

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Prod nutzt seit 2026-04-21 das neue Secret-Key-Format (sb_secret_*). Supabase
// lehnt Secret-Keys mit "Forbidden use of secret API key in browser" (401) ab,
// sobald der Request einen Browser-User-Agent traegt (Mozilla/...). Der Trigger
// ist AUSSCHLIESSLICH der User-Agent — der Key darf weiter sowohl im apikey- als
// auch im Authorization-Header stehen (das funktioniert fuer Legacy-JWT UND
// Secret-Keys). Node-fetch sendet zwar standardmaessig "node" (wird akzeptiert),
// wir setzen den UA aber explizit, damit der Service-Role-Zugriff in JEDER
// Umgebung (CI, andere Node-/Loader-Versionen) garantiert als Server gilt.
// Verifiziert gegen Prod 2026-06-14: server-UA -> 200 / 4xx-Schema (Key ok),
// Browser-UA -> 401 Forbidden. Gegenprobe: Publishable-Key im apikey-Header
// bricht REST (PGRST301 "Expected 3 parts in JWT") — daher KEIN Header-Umbau.
export const ADMIN_FETCH_USER_AGENT = "nachbar-e2e-admin/1.0 (+server)";

/**
 * Supabase REST API Aufruf mit Service Role Key (Admin-Zugriff, kein RLS).
 * @param table  Tabellenname (z.B. "heartbeats")
 * @param method HTTP-Methode
 * @param body   Request-Body (optional)
 * @param query  Query-String ohne fuehrendes "?" (optional, z.B. "id=eq.123&select=*")
 */
export async function supabaseAdmin(
  table: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  query?: string,
): Promise<{ data: unknown; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[SEED] Keine Supabase Credentials — Anfrage uebersprungen");
    return { data: null, error: "no_credentials" };
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "User-Agent": ADMIN_FETCH_USER_AGENT,
    "Content-Type": "application/json",
    Prefer:
      method === "POST"
        ? "return=representation,resolution=merge-duplicates"
        : method === "GET"
          ? "return=representation"
          : "return=minimal",
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: `${res.status}: ${text}` };
    }

    if (method === "DELETE" || method === "PATCH")
      return { data: null, error: null };
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Supabase Auth Admin API — generischer Aufruf fuer /auth/v1/admin/...
 * @param path   Pfad nach /auth/v1/admin (z.B. "users" oder "users/uuid")
 * @param method HTTP-Methode
 * @param body   Request-Body (optional)
 */
export async function supabaseAuthAdmin(
  path: string,
  method: "GET" | "POST" | "DELETE" | "PATCH",
  body?: unknown,
): Promise<{ data: unknown; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { data: null, error: "no_credentials" };
  }

  const url = `${SUPABASE_URL}/auth/v1/admin/${path}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "User-Agent": ADMIN_FETCH_USER_AGENT,
    "Content-Type": "application/json",
  };

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: `${res.status}: ${text}` };
    }

    if (method === "DELETE") return { data: null, error: null };
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
