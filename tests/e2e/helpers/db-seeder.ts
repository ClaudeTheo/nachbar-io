// Nachbar.io — Datenbank-Seeder: Erstellt Testdaten via Supabase API
// Strategie: Direct SQL via Supabase REST API oder Test-API-Route.
// Fuer CI ohne DB-Zugang: Mock-Modus via Test-API-Route (/api/test/seed).

import { TEST_HOUSEHOLDS, TEST_AGENTS, TEST_PREFIX } from "./test-config";
import type { AgentCredentials, TestHousehold } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Supabase REST API Aufruf mit Service Role Key (Admin-Zugriff, kein RLS).
 */
async function supabaseAdmin(
  table: string,
  method: "GET" | "POST" | "DELETE" | "PATCH",
  body?: unknown,
  query?: string
): Promise<{ data: unknown; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[SEED] Keine Supabase Credentials — Seeding uebersprungen");
    return { data: null, error: "no_credentials" };
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : "return=minimal",
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

/**
 * Supabase Auth Admin API — Nutzer erstellen.
 */
async function createAuthUser(
  email: string,
  password: string
): Promise<{ userId: string | null; error: string | null }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { userId: null, error: "no_credentials" };
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true, // Email-Verifikation ueberspringen
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    // Nutzer existiert bereits → ID auslesen
    if (text.includes("already been registered") || text.includes("already exists")) {
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?filter=email.eq.${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const user = listData.users?.find((u: { email: string }) => u.email === email);
        if (user) return { userId: user.id, error: null };
      }
      return { userId: null, error: `User exists but could not be found: ${text}` };
    }
    return { userId: null, error: `${res.status}: ${text}` };
  }

  const data = await res.json();
  return { userId: data.id, error: null };
}

/**
 * Alle Test-Haushalte anlegen.
 */
async function seedHouseholds(households: TestHousehold[]): Promise<void> {
  for (const hh of households) {
    const { error } = await supabaseAdmin("households", "POST", {
      id: hh.id,
      street_name: hh.streetName,
      house_number: hh.houseNumber,
      invite_code: hh.inviteCode,
      lat: hh.lat,
      lng: hh.lng,
      verified: true,
    });

    if (error && !error.includes("duplicate") && !error.includes("409")) {
      console.warn(`[SEED] Haushalt ${hh.id}: ${error}`);
    }
  }
  console.log(`[SEED] ${households.length} Haushalte angelegt/verifiziert`);
}

/**
 * Einen Test-Agenten anlegen (Auth-User + Profil + Haushalt-Mitgliedschaft).
 */
async function seedAgent(
  agentId: string,
  creds: AgentCredentials
): Promise<string | null> {
  // 1. Auth-User erstellen
  const { userId, error: authError } = await createAuthUser(creds.email, creds.password);
  if (authError || !userId) {
    console.warn(`[SEED] Agent ${agentId} Auth: ${authError}`);
    return null;
  }

  // 2. Profil anlegen (upsert)
  const { error: profileError } = await supabaseAdmin("users", "POST", {
    id: userId,
    email_hash: "",
    display_name: creds.displayName,
    ui_mode: creds.uiMode,
    is_admin: creds.isAdmin || false,
    trust_level: creds.role === "unverified" ? "new" : "verified",
  });

  if (profileError && !profileError.includes("duplicate") && !profileError.includes("409")) {
    console.warn(`[SEED] Agent ${agentId} Profil: ${profileError}`);
  }

  // 3. Haushalt-Zuordnung
  const household = TEST_HOUSEHOLDS.find((h) => h.inviteCode === creds.inviteCode);
  if (household) {
    const { error: memberError } = await supabaseAdmin("household_members", "POST", {
      household_id: household.id,
      user_id: userId,
      role: creds.isAdmin ? "owner" : "member",
    });

    if (memberError && !memberError.includes("duplicate") && !memberError.includes("409")) {
      console.warn(`[SEED] Agent ${agentId} Mitgliedschaft: ${memberError}`);
    }
  }

  console.log(`[SEED] Agent ${agentId} (${creds.displayName}) → userId=${userId}`);
  return userId;
}

/**
 * Komplettes Seeding: Haushalte + alle Agenten.
 * Gibt Map von agentId → userId zurueck.
 */
export async function seedAll(): Promise<Map<string, string>> {
  console.log("[SEED] Starte Seeding...");
  const userMap = new Map<string, string>();

  // 1. Haushalte
  await seedHouseholds(TEST_HOUSEHOLDS);

  // 2. Agenten
  for (const [agentId, creds] of Object.entries(TEST_AGENTS)) {
    const userId = await seedAgent(agentId, creds);
    if (userId) {
      userMap.set(agentId, userId);
    }
  }

  console.log(`[SEED] Fertig — ${userMap.size} Agenten angelegt`);
  return userMap;
}

/**
 * Testdaten aufraeumen: Alle Test-Entitaeten loeschen.
 * Reihenfolge beachten wegen Foreign Keys.
 */
export async function cleanupAll(): Promise<void> {
  console.log("[SEED] Starte Cleanup...");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[SEED] Kein Supabase-Zugang — Cleanup uebersprungen");
    return;
  }

  // Test-Emails finden und Auth-User loeschen
  for (const creds of Object.values(TEST_AGENTS)) {
    try {
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const user = listData.users?.find(
          (u: { email: string }) => u.email === creds.email
        );
        if (user) {
          await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
            method: "DELETE",
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          });
        }
      }
    } catch {
      // Ignorieren — User existiert evtl. nicht
    }
  }

  // Test-Haushalte loeschen (Kaskade loescht auch household_members)
  for (const hh of TEST_HOUSEHOLDS) {
    await supabaseAdmin("households", "DELETE", undefined, `id=eq.${hh.id}`);
  }

  console.log("[SEED] Cleanup abgeschlossen");
}

/**
 * Fallback Seeding via Test-API-Route (wenn kein direkter DB-Zugang).
 * Die App muss eine Route /api/test/seed bereitstellen.
 */
export async function seedViaApi(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/test/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        households: TEST_HOUSEHOLDS,
        agents: TEST_AGENTS,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
