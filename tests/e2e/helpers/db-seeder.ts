// Nachbar.io — Datenbank-Seeder: Erstellt Testdaten via Supabase API
// Strategie: Direct SQL via Supabase REST API oder Test-API-Route.
// Fuer CI ohne DB-Zugang: Mock-Modus via Test-API-Route (/api/test/seed).

import { TEST_HOUSEHOLDS, TEST_AGENTS } from "./test-config";
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
  query?: string,
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
    Prefer:
      method === "POST"
        ? "return=representation,resolution=merge-duplicates"
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
 * Supabase Auth Admin API — Nutzer erstellen.
 */
async function createAuthUser(
  email: string,
  password: string,
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
    // Nutzer existiert bereits → ID via signInWithPassword holen
    if (
      text.includes("already been registered") ||
      text.includes("already exists") ||
      text.includes("email_exists")
    ) {
      const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY;
      const signInRes = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
      );
      if (signInRes.ok) {
        const signInData = await signInRes.json();
        if (signInData.user?.id) {
          return { userId: signInData.user.id, error: null };
        }
      }
      return {
        userId: null,
        error: `User exists but sign-in failed: ${text}`,
      };
    }
    return { userId: null, error: `${res.status}: ${text}` };
  }

  const data = await res.json();
  return { userId: data.id, error: null };
}

/**
 * Pilotquartier-ID aus der DB holen (oder Test-Quartier anlegen).
 */
async function getOrCreateQuarterId(): Promise<string | null> {
  // Pilotquartier suchen
  const { data, error } = await supabaseAdmin(
    "quarters",
    "GET",
    undefined,
    "slug=eq.bad-saeckingen-pilot&select=id&limit=1",
  );
  if (!error && Array.isArray(data) && data.length > 0) {
    const qid = (data[0] as { id: string }).id;
    console.log(`[SEED] Pilotquartier gefunden: ${qid}`);
    return qid;
  }

  // Fallback: Test-Quartier anlegen
  const testQuarterId = "00000000-e2e0-4000-b001-000000000001";
  const { error: createErr } = await supabaseAdmin("quarters", "POST", {
    id: testQuarterId,
    name: "E2E Test-Quartier",
    slug: "e2e-test-quartier",
    center_lat: 47.5535,
    center_lng: 7.964,
    zoom_level: 17,
    bounds_sw_lat: 47.55,
    bounds_sw_lng: 7.958,
    bounds_ne_lat: 47.557,
    bounds_ne_lng: 7.971,
  });
  if (
    createErr &&
    !createErr.includes("duplicate") &&
    !createErr.includes("409")
  ) {
    console.warn(`[SEED] Test-Quartier anlegen: ${createErr}`);
    return null;
  }
  console.log(`[SEED] Test-Quartier angelegt: ${testQuarterId}`);
  return testQuarterId;
}

/**
 * Alle Test-Haushalte anlegen.
 */
async function seedHouseholds(households: TestHousehold[]): Promise<void> {
  const quarterId = await getOrCreateQuarterId();
  if (!quarterId) {
    console.warn(
      "[SEED] Kein Quartier verfuegbar — Haushalte koennen nicht angelegt werden",
    );
    return;
  }

  for (const hh of households) {
    const { data: _data, error } = await supabaseAdmin("households", "POST", {
      id: hh.id,
      street_name: hh.streetName,
      house_number: hh.houseNumber,
      invite_code: hh.inviteCode,
      lat: hh.lat,
      lng: hh.lng,
      verified: true,
      quarter_id: quarterId,
    });

    if (error) {
      console.warn(`[SEED] Haushalt ${hh.id} (${hh.inviteCode}): ${error}`);
    } else {
      console.log(`[SEED] Haushalt ${hh.id} (${hh.inviteCode}): OK`);
    }
  }
  console.log(
    `[SEED] ${households.length} Haushalte angelegt/verifiziert (quarter=${quarterId})`,
  );
}

/**
 * Einen Test-Agenten anlegen (Auth-User + Profil + Haushalt-Mitgliedschaft).
 */
async function seedAgent(
  agentId: string,
  creds: AgentCredentials,
): Promise<string | null> {
  // 1. Auth-User erstellen
  const { userId, error: authError } = await createAuthUser(
    creds.email,
    creds.password,
  );
  if (authError || !userId) {
    console.warn(`[SEED] Agent ${agentId} Auth: ${authError}`);
    return null;
  }

  // 2. Profil anlegen (upsert — bei Duplikat aktualisieren)
  const profileData = {
    id: userId,
    email_hash: "",
    display_name: creds.displayName,
    ui_mode: creds.uiMode,
    is_admin: creds.isAdmin || false,
    trust_level: creds.role === "unverified" ? "new" : "verified",
    settings: { onboarding_completed: true },
  };
  const { error: profileError } = await supabaseAdmin(
    "users",
    "POST",
    profileData,
  );

  if (
    profileError &&
    (profileError.includes("duplicate") || profileError.includes("409"))
  ) {
    // Bestehenden User aktualisieren (ui_mode, trust_level etc.)
    const { id: _id, ...updateData } = profileData;
    await supabaseAdmin("users", "PATCH", updateData, `id=eq.${userId}`);
  } else if (profileError) {
    console.warn(`[SEED] Agent ${agentId} Profil: ${profileError}`);
  }

  // 3. Haushalt-Zuordnung
  const household = TEST_HOUSEHOLDS.find(
    (h) => h.inviteCode === creds.inviteCode,
  );
  if (household) {
    const verifiedAt = new Date().toISOString();
    const { error: memberError } = await supabaseAdmin(
      "household_members",
      "POST",
      {
        household_id: household.id,
        user_id: userId,
        role: creds.isAdmin ? "owner" : "member",
        verified_at: verifiedAt,
      },
    );

    if (
      memberError &&
      (memberError.includes("duplicate") || memberError.includes("409"))
    ) {
      // Bestehende Zeile: verified_at sicherstellen (alter Datensatz hat evtl. NULL)
      const { error: patchError } = await supabaseAdmin(
        "household_members",
        "PATCH",
        { verified_at: verifiedAt },
        `household_id=eq.${household.id}&user_id=eq.${userId}`,
      );
      if (patchError) {
        console.warn(
          `[SEED] Agent ${agentId} verified_at PATCH: ${patchError}`,
        );
      } else {
        console.log(`[SEED] Agent ${agentId} verified_at aktualisiert`);
      }
    } else if (memberError) {
      console.warn(`[SEED] Agent ${agentId} Mitgliedschaft: ${memberError}`);
    }
  }

  // 4. Care-Consent anlegen (Art. 9 DSGVO — noetig fuer Check-in, SOS, Medikamente)
  const consentFeatures = ["checkin", "sos", "medications", "heartbeat"];
  for (const feature of consentFeatures) {
    const { error: consentError } = await supabaseAdmin(
      "care_consents",
      "POST",
      {
        user_id: userId,
        feature,
        granted: true,
        consent_version: "e2e-test-v1",
      },
    );
    if (
      consentError &&
      !consentError.includes("duplicate") &&
      !consentError.includes("409")
    ) {
      // Tabelle existiert evtl. nicht — nur loggen, nicht abbrechen
      if (!consentError.includes("404")) {
        console.warn(
          `[SEED] Agent ${agentId} Consent ${feature}: ${consentError}`,
        );
      }
    }
  }

  console.log(
    `[SEED] Agent ${agentId} (${creds.displayName}) → userId=${userId}`,
  );
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

  // 3. Rollen-spezifisches Seeding (Org, Doctor, Caregiver-Links)
  await seedRoleSpecificData(userMap);

  console.log(`[SEED] Fertig — ${userMap.size} Agenten angelegt`);
  return userMap;
}

/**
 * Rollen-spezifisches Seeding: Organisation, Doctor-Profil, Caregiver-Links.
 */
async function seedRoleSpecificData(
  userMap: Map<string, string>,
): Promise<void> {
  const quarterId = await getOrCreateQuarterId();

  // --- Organisation fuer stadt_k (Pro Community) ---
  const stadtUserId = userMap.get("stadt_k");
  if (stadtUserId) {
    const orgId = "00000000-e2e0-4000-c001-000000000001";
    const { error: orgError } = await supabaseAdmin("organizations", "POST", {
      id: orgId,
      name: "Stadt Bad Säckingen (E2E)",
      type: "kommune",
      hr_vr_number: "VR-E2E-12345",
      verification_status: "verified",
      avv_signed_at: new Date().toISOString(),
    });
    if (orgError && !orgError.includes("duplicate") && !orgError.includes("409")) {
      console.warn(`[SEED] Organisation: ${orgError}`);
    } else {
      console.log(`[SEED] Organisation angelegt: ${orgId}`);
    }

    // org_members Eintrag
    const { error: memberError } = await supabaseAdmin("org_members", "POST", {
      org_id: orgId,
      user_id: stadtUserId,
      role: "admin",
      assigned_quarters: quarterId ? [quarterId] : [],
    });
    if (memberError && !memberError.includes("duplicate") && !memberError.includes("409")) {
      console.warn(`[SEED] Org-Member stadt_k: ${memberError}`);
    } else {
      console.log(`[SEED] stadt_k als org_admin zugewiesen`);
    }
  }

  // --- Doctor-Profil fuer arzt_d (Pro Medical) ---
  const arztUserId = userMap.get("arzt_d");
  if (arztUserId) {
    const { error: docError } = await supabaseAdmin("doctor_profiles", "POST", {
      user_id: arztUserId,
      specialization: ["Allgemeinmedizin"],
      bio: "Dr. med. Daniel F. — Allgemeinmedizin, E2E-Testarzt",
      visible: true,
      quarter_ids: quarterId ? [quarterId] : [],
    });
    if (docError && !docError.includes("duplicate") && !docError.includes("409")) {
      console.warn(`[SEED] Doctor-Profil arzt_d: ${docError}`);
    } else {
      console.log(`[SEED] arzt_d Doctor-Profil angelegt`);
    }
  }

  // --- Caregiver-Link: senior_s <-> betreuer_t ---
  const seniorUserId = userMap.get("senior_s");
  const betreuerUserId = userMap.get("betreuer_t");
  if (seniorUserId && betreuerUserId) {
    const { error: linkError } = await supabaseAdmin("caregiver_links", "POST", {
      resident_id: seniorUserId,
      caregiver_id: betreuerUserId,
      permissions: { heartbeat: true, checkin: true, chat: true },
    });
    if (linkError && !linkError.includes("duplicate") && !linkError.includes("409")) {
      console.warn(`[SEED] Caregiver-Link: ${linkError}`);
    } else {
      console.log(`[SEED] Caregiver-Link senior_s → betreuer_t angelegt`);
    }
  }
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
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const user = listData.users?.find(
          (u: { email: string }) => u.email === creds.email,
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
