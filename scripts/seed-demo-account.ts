#!/usr/bin/env npx tsx
// scripts/seed-demo-account.ts
// Legt den Investoren-Demo-Account an: eigenes Demo-Quartier + Demo-Haushalt +
// Demo-User (synthetisch, Closed-Pilot-approved). Der Zugang laeuft danach
// ueber GET /demo-zugang?t=<DEMO_ACCESS_TOKEN> (siehe app/demo-zugang/route.ts).
//
// Idempotent: mehrfaches Ausfuehren repariert/aktualisiert den Bestand,
// erzeugt keine Duplikate. Quartier-Inhalte optional per
// `npm run seed:quarter -- --quarter=demo-quartier` ergaenzen.
//
// Usage: npx tsx scripts/seed-demo-account.ts
// Benoetigte Env-Variablen (vorher in der Shell setzen, keine Literale hier):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   DEMO_USER_EMAIL, DEMO_USER_PASSWORD
//
// WICHTIG: Gegen Prod nur mit Founder-Go ausfuehren (Prod-DB-Schreibzugriff).

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const adminSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL;
const demoKennwort = process.env.DEMO_USER_PASSWORD;

if (!SUPABASE_URL || !adminSecret || !DEMO_EMAIL || !demoKennwort) {
  console.error(
    "Fehler: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_USER_EMAIL und DEMO_USER_PASSWORD muessen gesetzt sein.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, adminSecret);

// Demo-Quartier: bewusst EIGENES Quartier — RLS haelt den Demo-Account damit
// vollstaendig vom Pilot-Quartier (echte Testhaushalte) getrennt.
const DEMO_QUARTER = {
  slug: "demo-quartier",
  name: "Demo-Quartier",
  description:
    "Synthetisches Demo-Quartier fuer Produktvorfuehrungen. Keine echten Haushalte.",
  center_lat: 47.5495,
  center_lng: 7.9525,
  bounds_sw_lat: 47.5445,
  bounds_sw_lng: 7.9455,
  bounds_ne_lat: 47.5545,
  bounds_ne_lng: 7.9595,
  city: "Bad Saeckingen",
  state: "Baden-Wuerttemberg",
  country: "DE",
  // Spalten-Default "draft" verletzt quarters_status_check — explizit setzen
  status: "active",
  settings: { demo: true },
};

// Reale Adresse im Pilotgebiet als Demo-Kulisse (Founder-Wunsch 2026-07-12):
// dadurch zeigen Karte/Wetter/Warnungen echte Bad-Saeckingen-Inhalte. Der
// Haushalt bleibt trotzdem im ISOLIERTEN Demo-Quartier — nie im Pilot-Quartier.
const DEMO_HOUSEHOLD = {
  street_name: "Purkersdorfer Strasse",
  house_number: "37",
  lat: 47.5535,
  lng: 7.964,
  city: "Bad Saeckingen",
  verified: true,
};

const DEMO_DISPLAY_NAME = "Familie Beispiel";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Zufaelliger Haushalts-Invite-Code (wird bewusst NICHT ausgegeben): ein
// erratbarer Demo-Code waere ein Registrierungs-Einfallstor in den Haushalt.
function randomInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function ensureQuarter(): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from("quarters")
    .select("id")
    .eq("slug", DEMO_QUARTER.slug)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    console.log(`✓ Demo-Quartier existiert (${existing.id})`);
    return existing.id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("quarters")
    .insert(DEMO_QUARTER)
    .select("id")
    .single();
  if (insErr) throw insErr;
  console.log(`+ Demo-Quartier angelegt (${inserted.id})`);
  return inserted.id;
}

async function ensureAuthUser(): Promise<string> {
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: DEMO_EMAIL!,
      password: demoKennwort!,
      email_confirm: true,
    });

  if (!createErr && created.user) {
    console.log(`+ Auth-User angelegt (${created.user.id})`);
    return created.user.id;
  }

  // Existiert bereits → per Listing finden und Kennwort auf Env-Stand setzen
  for (let page = 1; page <= 20; page++) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const match = list.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL!.toLowerCase(),
    );
    if (match) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(
        match.id,
        { password: demoKennwort!, email_confirm: true },
      );
      if (updErr) throw updErr;
      console.log(`✓ Auth-User existiert, Kennwort aktualisiert (${match.id})`);
      return match.id;
    }
    if (list.users.length < 200) break;
  }

  throw new Error(
    `Auth-User konnte weder angelegt noch gefunden werden: ${createErr?.message}`,
  );
}

async function ensureProfile(userId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .maybeSingle();
  if (selErr) throw selErr;

  const previousSettings =
    (existing?.settings as Record<string, unknown> | null) ?? {};

  const { error: upsertErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email_hash: sha256Hex(DEMO_EMAIL!.toLowerCase()),
      display_name: DEMO_DISPLAY_NAME,
      ui_mode: "active",
      trust_level: "verified",
      // Spalten-Default "user" verletzt users_role_check — explizit setzen
      role: "resident",
      is_admin: false,
      settings: {
        ...previousSettings,
        pilot_approval_status: "approved",
        is_test_user: true,
        test_user_kind: "demo",
        // Investoren sollen direkt im Dashboard landen, nicht im 6-Schritte-Onboarding
        onboarding_completed: true,
        // KI-Hilfe (Vorlesen, Assistent, Sprachverstehen) fuer die Demo freischalten
        ai_assistance_level: "everyday",
      },
    },
    { onConflict: "id" },
  );
  if (upsertErr) throw upsertErr;
  console.log(
    `✓ Profil "${DEMO_DISPLAY_NAME}" gesetzt (ui_mode=active, approved)`,
  );
}

// KI-Hilfe braucht neben settings.ai_assistance_level auch einen granted
// care_consents-Eintrag fuer "ai_onboarding" (canUsePersonalAi, Zwei-Gate-Modell).
// Der AI_PROVIDER_OFF-Feature-Flag bleibt davon unberuehrt (Founder-Kill-Switch).
async function ensureAiConsent(userId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("care_consents")
    .select("id, granted")
    .eq("user_id", userId)
    .eq("feature", "ai_onboarding")
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.granted) {
    console.log("✓ KI-Consent (ai_onboarding) existiert");
    return;
  }

  if (existing) {
    const { error: updErr } = await supabase
      .from("care_consents")
      .update({ granted: true, granted_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await supabase.from("care_consents").insert({
      user_id: userId,
      feature: "ai_onboarding",
      granted: true,
      consent_version: "demo-seed",
      granted_at: new Date().toISOString(),
    });
    if (insErr) throw insErr;
  }
  console.log("+ KI-Consent (ai_onboarding) gesetzt");
}

async function ensureHousehold(quarterId: string): Promise<string> {
  // Lookup ueber das Quartier (nicht ueber die Adresse): das Demo-Quartier hat
  // genau einen Haushalt, dessen Adresse sich per Re-Seed aendern darf.
  const { data: existing, error: selErr } = await supabase
    .from("households")
    .select("id")
    .eq("quarter_id", quarterId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error: updErr } = await supabase
      .from("households")
      .update({ ...DEMO_HOUSEHOLD, quarter_id: quarterId })
      .eq("id", existing.id);
    if (updErr) throw updErr;
    console.log(
      `✓ Demo-Haushalt aktualisiert (${existing.id}, ${DEMO_HOUSEHOLD.street_name} ${DEMO_HOUSEHOLD.house_number})`,
    );
    return existing.id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("households")
    .insert({
      ...DEMO_HOUSEHOLD,
      quarter_id: quarterId,
      invite_code: randomInviteCode(),
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  console.log(`+ Demo-Haushalt angelegt (${inserted.id})`);
  return inserted.id;
}

// Kopiert die Datenquellen-Verdrahtung des echten Pilot-Quartiers auf das
// Demo-Quartier: bbk_ars/bw_ars (NINA/LGL-Warnungs-Crons selektieren Quartiere
// mit gesetztem ARS), waste_area_id (Muellkalender), postal_code und die
// echten Koordinaten (Wetter/Pollen/Karte). Nur DATEN-Verdrahtung — Nutzer,
// Haushalte und Inhalte des Pilot-Quartiers bleiben unberuehrt und fuer den
// Demo-Account per RLS unsichtbar.
async function syncQuarterDataSources(demoQuarterId: string) {
  const { data: source, error: selErr } = await supabase
    .from("quarters")
    .select("slug, center_lat, center_lng, bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng, postal_code, bbk_ars, bw_ars, waste_area_id")
    .neq("id", demoQuarterId)
    .not("bbk_ars", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;

  if (!source) {
    console.log(
      "! Kein Quell-Quartier mit bbk_ars gefunden — Datenquellen-Kopie uebersprungen (z. B. lokaler Stack)",
    );
    return;
  }

  const { error: updErr } = await supabase
    .from("quarters")
    .update({
      center_lat: source.center_lat,
      center_lng: source.center_lng,
      bounds_sw_lat: source.bounds_sw_lat,
      bounds_sw_lng: source.bounds_sw_lng,
      bounds_ne_lat: source.bounds_ne_lat,
      bounds_ne_lng: source.bounds_ne_lng,
      postal_code: source.postal_code,
      bbk_ars: source.bbk_ars,
      bw_ars: source.bw_ars,
      waste_area_id: source.waste_area_id,
    })
    .eq("id", demoQuarterId);
  if (updErr) throw updErr;
  console.log(
    `✓ Datenquellen vom Quartier "${source.slug}" uebernommen (Warnungen/Muell/Wetter-Geo)`,
  );
}

async function ensureMembership(householdId: string, userId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("household_members")
    .select("id, verified_at")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throw selErr;

  let memberId = existing?.id as string | undefined;
  let verifiedAt = existing?.verified_at as string | null | undefined;

  if (!memberId) {
    const { data: inserted, error: insErr } = await supabase
      .from("household_members")
      .insert({
        household_id: householdId,
        user_id: userId,
        verification_method: "demo_seed",
      })
      .select("id, verified_at")
      .single();
    if (insErr) throw insErr;
    memberId = inserted.id;
    verifiedAt = inserted.verified_at;
    console.log("+ Haushalts-Mitgliedschaft angelegt");
  }

  // verified_at separat per UPDATE setzen: der BEFORE-INSERT-Trigger
  // enforce_member_defaults nullt verified_at beim INSERT (auth.uid() ist bei
  // service_role NULL, Admin-Check schlaegt fehl). Er feuert NICHT bei UPDATE.
  if (!verifiedAt) {
    const { error: updErr } = await supabase
      .from("household_members")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", memberId);
    if (updErr) throw updErr;
  }
  console.log("✓ Haushalts-Mitgliedschaft verifiziert");
}

async function main() {
  console.log(`Seed Demo-Account gegen ${SUPABASE_URL}`);

  const quarterId = await ensureQuarter();
  await syncQuarterDataSources(quarterId);
  const userId = await ensureAuthUser();
  await ensureProfile(userId);
  await ensureAiConsent(userId);
  const householdId = await ensureHousehold(quarterId);
  await ensureMembership(householdId, userId);

  console.log("");
  console.log("Fertig. Naechste Schritte:");
  console.log(
    "  1. Optional Inhalte seeden: npm run seed:quarter -- --quarter=demo-quartier",
  );
  console.log(
    "  2. DEMO_ACCESS_TOKEN, DEMO_USER_EMAIL, DEMO_USER_PASSWORD als Env setzen (Vercel: Founder-Hand)",
  );
  console.log(
    "  3. Demo-Link teilen: <app-url>/demo-zugang?t=<DEMO_ACCESS_TOKEN>",
  );
}

main().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
