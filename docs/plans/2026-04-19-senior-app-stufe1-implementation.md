# Senior App Stufe 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Senior App als Native-App auf Windows (Tauri), Android + iOS (Capacitor) ausliefern. QR-Onboarding, KI-geführter Einstieg (Claude Haiku + Memory), Care-Access für Angehörige per QR-Scan, Notfall-Karte öffentlich.

**Architecture:** Eine Web-Codebase (`app/(senior)/*` in nachbar-io). Drei dünne Wrapper. Neue API-Routes für Device-Pairing + Care-Access-Scan + Notfall-Public. Memory-Frontend auf existierender `user_memory_facts` Mig 122. Admin-UI-Gruppe Care-Access nach Muster der heute gebauten Gesundheit-Gruppe.

**Tech Stack:** Next.js 16 (existiert), Tauri 2.x (neu), Capacitor 8.2 (existiert), Supabase EU-Frankfurt (existiert), Claude Haiku 4 + Mistral Small (neu), TTS OpenAI (existiert), Vitest + Playwright (existiert).

**Scope:** ~3-4 Wochen. 4 Wellen. Jede Welle endet mit lauffähigem Teilresultat + eigener Commit-Serie + eigener Deploy.

**Referenz:** `docs/plans/2026-04-19-senior-app-stufe1-design.md` (Design, committed `94d9b21`).

**Rote Zone (Founder-Go nötig):**
- Prod-Migrationen 171, 172, 173 (neue Tabellen)
- `nachbar-kiosk/` komplett löschen
- Push auf master (3-4× im Verlauf)
- Google-Play-Account $25
- AVV mit Anthropic + Mistral unterzeichnen

---

## Welle-Übersicht

| Welle | Inhalt | Dauer | Ende-Zustand |
|---|---|---|---|
| **A — Fundament** | Admin-Flags, DB-Migrationen, nachbar-kiosk-Delete | ~3 Tage | Grundlagen on prod |
| **B — QR-Onboarding** | Device-Pairing, Long-Lived-Token, Scanner-Komponente | ~5 Tage | Gerät paart sich, bleibt eingeloggt |
| **C — KI + Memory** | AI_PROVIDER-Flag, System-Prompt, Onboarding-Wizard, Memory-UI | ~7 Tage | KI führt Senior durch Onboarding |
| **D — Care-Access + Notfall-Public** | QR-Scan für Angehörige, Notfall-Public-Seite | ~5 Tage | Familie scannt Senior, Notfall-Karte öffentlich |
| **E — Native Wrapper** | Tauri Win + Capacitor Android/iOS Build + Store-Upload | ~5 Tage | Apps in Testflight + Internal Testing |

---

# Welle A — Fundament

**Ziel:** DB + Admin-UI vorbereitet. Zombies (nachbar-kiosk) weg.

## Task A1: Admin-UI Gruppe „Care-Access" + 4 Flags

**Files:**
- Modify: `app/(app)/admin/components/FeatureFlagManager.tsx` (neue Gruppe analog „Gesundheit")
- Test: `__tests__/components/admin/FeatureFlagManager.test.tsx` (bestehend, Assertion ergänzen)

**Step 1: Test zuerst** — neuer Testcase „zeigt Gruppe Care-Access mit 4 Flags"

```ts
// Ergänzung in FeatureFlagManager.test.tsx
it("zeigt die Gesundheit-Gruppe nicht im Care-Access-Bereich (Trennung)", () => {
  // assert MEDICATIONS_ENABLED ist in Gesundheit, NICHT in Care-Access
});
it("zeigt Care-Access Gruppe mit 4 Flags", async () => {
  // Setup: 4 Flags seeden
  // Render + assert Gruppe sichtbar
});
```

**Step 2: Test rot laufen lassen**

```bash
npx vitest run __tests__/components/admin/FeatureFlagManager.test.tsx
```

**Step 3: FLAG_GROUPS erweitern**

```ts
// VOR der "Gesundheit"-Gruppe in FLAG_GROUPS einfügen:
{
  title: "Care-Access",
  pattern: /^CARE_ACCESS_/,
},
```

**Step 4: FLAG_DESCRIPTIONS ergänzen**

```ts
CARE_ACCESS_FAMILY: "Familie/Freunde dürfen Senior per QR scannen (A)",
CARE_ACCESS_INDIVIDUAL_CAREGIVER: "Einzel-Pflegerin darf Senior scannen (B)",
CARE_ACCESS_CARE_COMPANY: "Pflegefirma/Heim darf scannen (C)",
CARE_ACCESS_EMERGENCY: "Öffentliche Notfall-Karte (E)",
```

**Step 5: Test grün + Commit**

```bash
git add app/\(app\)/admin/components/FeatureFlagManager.tsx __tests__/components/admin/FeatureFlagManager.test.tsx
git commit -m "feat(admin): add Care-Access flag group (4 flags)"
```

---

## Task A2: Migration 171 — Care-Access Feature-Flags

**Files:**
- Create: `supabase/migrations/171_care_access_feature_flags.sql`
- Create: `supabase/migrations/171_care_access_feature_flags.down.sql`

**Step 1: Datei schreiben**

```sql
-- 171_care_access_feature_flags.sql
begin;

insert into public.feature_flags (key, enabled, required_plans, description)
values
  ('CARE_ACCESS_FAMILY', true, array[]::text[],
   'QR-Scan-Zugriff fuer Familie/Freunde (Pilot Default ON)'),
  ('CARE_ACCESS_INDIVIDUAL_CAREGIVER', false, array['pro']::text[],
   'QR-Scan-Zugriff fuer Einzel-Pflegerinnen (Stufe 2)'),
  ('CARE_ACCESS_CARE_COMPANY', false, array['pro']::text[],
   'QR-Scan-Zugriff fuer Pflegefirmen/Heime (Stufe 3)'),
  ('CARE_ACCESS_EMERGENCY', true, array[]::text[],
   'Oeffentliche Notfall-Karte per QR-Token (Default ON)'),
  ('AI_PROVIDER_CLAUDE', true, array[]::text[],
   'KI-Provider Claude Haiku 4 (Pilot Default)'),
  ('AI_PROVIDER_MISTRAL', false, array[]::text[],
   'KI-Provider Mistral Small Paris (DSGVO-Alternative)'),
  ('AI_PROVIDER_OFF', false, array[]::text[],
   'KI komplett aus - Formular-only Onboarding')
on conflict (key) do nothing;

commit;
```

Down: `delete where key in (...)`.

**Step 2: Datei-Commit (nur lokal)**

```bash
git add supabase/migrations/171_*.sql
git commit -m "feat(db): add migration 171 - care-access + AI provider flags"
```

**Step 3: FOUNDER-GO für Prod-Apply**

---

## Task A3: `nachbar-kiosk/` löschen

**Files:**
- Delete: kompletter Ordner `nachbar-kiosk/` (Pi-5-Legacy, 12 000 Z. Rust + HTML, nie live gegangen)

**Step 1: Bestätigen, dass kein Code aus anderen Projekten importiert**

```bash
grep -r "nachbar-kiosk" nachbar-io/ nachbar-arzt/ nachbar-civic/ nachbar-pflege/ nachbar-admin/ --include="*.ts" --include="*.tsx" --include="*.json"
```

Erwartet: keine Treffer (nachbar-kiosk ist eigenständig).

**Step 2: Ordner löschen**

```bash
cd "C:/Users/thoma/Claud Code/Handy APP"
git rm -rf nachbar-kiosk/
```

**Step 3: Commit**

```bash
git commit -m "chore(kiosk): delete nachbar-kiosk (Pi 5 legacy, replaced by Tauri Windows wrapper)"
```

**Step 4: Push aller Welle-A-Commits (FOUNDER-GO)**

---

# Welle B — QR-Onboarding + Device-Pairing

**Ziel:** Senior-Gerät paart sich via QR mit Angehörigen-Handy. Bleibt 6 Monate eingeloggt.

## Task B1: Migration 172 — `device_refresh_tokens`

**Files:**
- Create: `supabase/migrations/172_device_refresh_tokens.sql` + `.down.sql`

**Step 1: Migration schreiben**

```sql
begin;

create table if not exists public.device_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  device_id text not null,
  token_hash text not null,
  pairing_method text not null check (pairing_method in ('qr','code','magic_link')),
  user_agent text,
  last_ip inet,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text
);

create index if not exists device_refresh_tokens_user_active_idx
  on public.device_refresh_tokens (user_id) where revoked_at is null;
create index if not exists device_refresh_tokens_expires_idx
  on public.device_refresh_tokens (expires_at);
create index if not exists device_refresh_tokens_device_idx
  on public.device_refresh_tokens (device_id, user_id);

alter table public.device_refresh_tokens enable row level security;

create policy "users see own devices"
  on public.device_refresh_tokens for select
  using (user_id = auth.uid());

create policy "users revoke own devices"
  on public.device_refresh_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and revoked_at is not null);

commit;
```

Down: `drop table device_refresh_tokens`.

**Step 2: Commit (Prod-Apply nach Founder-Go)**

---

## Task B2: Pairing-Token-Generator + Verifier (Lib)

**Files:**
- Create: `lib/device-pairing/token.ts`
- Test: `lib/device-pairing/__tests__/token.test.ts`

**Step 1: Test (TDD)**

```ts
import { describe, it, expect } from "vitest";
import {
  createPairingToken,
  verifyPairingToken,
} from "@/lib/device-pairing/token";

describe("createPairingToken", () => {
  it("erzeugt JWT mit device_id + exp 10 min", async () => {
    const { token, payload } = await createPairingToken({
      device_id: "dev-1",
      user_agent: "iPhone",
    });
    expect(token).toMatch(/^eyJ/);
    expect(payload.device_id).toBe("dev-1");
    expect(payload.exp - payload.iat).toBe(600);
  });
});

describe("verifyPairingToken", () => {
  it("akzeptiert gueltigen Token", async () => {
    const { token } = await createPairingToken({ device_id: "dev-1" });
    const res = await verifyPairingToken(token);
    expect(res.valid).toBe(true);
  });
  it("lehnt abgelaufenen Token ab", async () => {
    // mock clock oder kurzer TTL
  });
  it("lehnt manipulierten Token ab", async () => {
    const { token } = await createPairingToken({ device_id: "dev-1" });
    const tampered = token.slice(0, -2) + "XX";
    const res = await verifyPairingToken(tampered);
    expect(res.valid).toBe(false);
  });
});
```

**Step 2: Test rot laufen**

```bash
npx vitest run lib/device-pairing/__tests__/token.test.ts
```

**Step 3: Implementation**

```ts
// lib/device-pairing/token.ts
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.DEVICE_PAIRING_SECRET ?? "dev-secret-do-not-use-in-prod",
);

export interface PairingTokenPayload {
  device_id: string;
  user_agent?: string;
  iat: number;
  exp: number;
}

export async function createPairingToken(input: {
  device_id: string;
  user_agent?: string;
}): Promise<{ token: string; payload: PairingTokenPayload }> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 600; // 10 min
  const payload: PairingTokenPayload = { ...input, iat, exp };
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(SECRET);
  return { token, payload };
}

export async function verifyPairingToken(
  token: string,
): Promise<
  | { valid: true; payload: PairingTokenPayload }
  | { valid: false; reason: string }
> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { valid: true, payload: payload as unknown as PairingTokenPayload };
  } catch (e) {
    return { valid: false, reason: (e as Error).message };
  }
}
```

**Step 4: Test grün + Commit**

```bash
git add lib/device-pairing/ 
git commit -m "feat(device-pairing): add JWT pairing token generator/verifier"
```

---

## Task B3: API Route `/api/device/pair/start` (Senior-Gerät)

**Files:**
- Create: `app/api/device/pair/start/route.ts`
- Test: `__tests__/api/device/pair-start.test.ts`

**Step 1: Test (TDD)**

Senior-Gerät ruft ohne Auth POST auf → bekommt JWT + device_id zurück.

```ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/device/pair/start/route";
import { NextRequest } from "next/server";

describe("POST /api/device/pair/start", () => {
  it("liefert JWT + device_id zurueck", async () => {
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      body: JSON.stringify({ device_id: "dev-1", user_agent: "Capacitor iOS" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.token).toMatch(/^eyJ/);
    expect(data.device_id).toBe("dev-1");
  });
  it("lehnt Request ohne device_id ab", async () => {
    const req = new NextRequest("http://localhost/api/device/pair/start", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Test rot laufen**

**Step 3: Implementation**

```ts
// app/api/device/pair/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createPairingToken } from "@/lib/device-pairing/token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const device_id = typeof body.device_id === "string" ? body.device_id : null;
  const user_agent =
    typeof body.user_agent === "string" ? body.user_agent : undefined;
  if (!device_id) {
    return NextResponse.json(
      { error: "device_id erforderlich" },
      { status: 400 },
    );
  }
  const { token } = await createPairingToken({ device_id, user_agent });
  return NextResponse.json({ token, device_id, expires_in: 600 });
}
```

**Step 4: Test grün + Commit**

---

## Task B4: API Route `/api/device/pair/claim` (Angehörigen-Handy)

**Files:**
- Create: `app/api/device/pair/claim/route.ts`
- Test: `__tests__/api/device/pair-claim.test.ts`

**Logik:**
1. Angehöriger eingeloggt, POST mit `pair_token` + `senior_user_id` (optional, wenn schon bekannt) oder `create_new_senior` + Stammdaten.
2. Server verifiziert Pair-Token.
3. Wenn senior existiert + angehöriger hat schon `caregiver_links` → sofort refresh-token erzeugen.
4. Wenn senior neu → erstelle auth.user (ohne Passwort, only device), link caregiver_link.
5. Generiere `device_refresh_token` (zufällige 32 Bytes, hash in DB speichern), Rückgabe an Angehörigen-App als Quittung.
6. Senior-Gerät pollt `GET /api/device/pair/status?token=<pair-token>` → bekommt refresh-token.

**Step 1-5: Test + Impl + Commit** (siehe `lib/device-pairing/claim.ts` im Plan genau beschrieben)

---

## Task B5: API `/api/device/pair/status` (Polling)

**Files:**
- Create: `app/api/device/pair/status/route.ts`
- Test: analog

**Step 1-5:** Senior-Gerät pollt alle 2 s → sobald paired, refresh-token zurück. Implementation mit Redis für Pending-Pairings (Key `pair:<pair-token>` → refresh-token nach Claim).

---

## Task B6: Senior-App Start-Seite Umbau (QR anzeigen)

**Files:**
- Modify: `app/(senior)/page.tsx` (oder neue `app/(senior)/pair/page.tsx`)
- Test: `__tests__/app/senior/pair.test.tsx`

**Inhalt:** Großer QR (4 cm × 4 cm auf Tablet), TTS-Voice „Bitte bitten Sie einen Angehörigen, den Code abzufotografieren", darunter Button „Ich habe einen Code" (Weg 2).

**Step 1-5:** wie üblich.

---

## Task B7: Refresh-Token Auto-Rotation

**Files:**
- Create: `lib/device-pairing/refresh.ts` (Hook für Senior-App)
- Test: analog

Jede 5 min POST `/api/device/pair/refresh` → neuer refresh-token, alter revoked.

---

## Task B8: Welle B Verifikations-Commit + Founder-Go Push

E2E-Test lokal: 2 Browser-Tabs (eines als Senior, eines als Angehöriger), komplette Paring-Kette.

---

# Welle C — KI + Senior-Memory

**Ziel:** Senior wird von KI durchs Onboarding geführt. Memory wird befüllt. Angehörige sehen + editieren.

## Task C1: Migration 173 — Memory-Consents erweitern

**Files:**
- Create: `supabase/migrations/173_memory_consents.sql` + `.down.sql`

```sql
begin;
-- Erweitert care_consents (Mig 108) um Memory-Features.
-- Keine neuen Spalten, nur Daten-Seed der Features.
-- Tatsaechliche Consent-Rows werden vom User via API erstellt.
-- Dieser INSERT ist dokumentarisch: Feature-Keys die erlaubt sind.

comment on table public.care_consents is
  'DSGVO-Consent-Log. Bekannte Features: sos, checkin, medications, '
  'care_profile, emergency_contacts, memory_basis, memory_care, memory_personal, '
  'ai_onboarding.';

commit;
```

---

## Task C2: KI-Provider-Abstraktion

**Files:**
- Create: `lib/ai/provider.ts` + `lib/ai/claude.ts` + `lib/ai/mistral.ts` + `lib/ai/off.ts`
- Test: `lib/ai/__tests__/provider.test.ts`

**Interface:**

```ts
export interface AIProvider {
  chat(input: {
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    tools?: AITool[];
  }): Promise<AIResponse>;
}
```

Claude + Mistral implementieren, `off` wirft Error, Flag-basierte Factory.

**Step 1-5: Test + Impl + Commit** pro Provider.

---

## Task C3: App-Wissensdokument (RAG)

**Files:**
- Create: `lib/ai/system-prompts/senior-app-knowledge.md` (~5000 Wörter: Features, Navigation, Quartier Bad Säckingen, DSGVO-Regeln, HARTE_LAENGE-Regel, Senior-Ton-Guide)
- Test: länge + Kernbegriffe enthalten

---

## Task C4: `save_memory` Tool-Implementierung

**Files:**
- Create: `lib/ai/tools/save-memory.ts`
- Test: analog

Liest Tool-Call aus KI-Response → validiert gegen Schema → verschlüsselt wenn `category in ('care_need','personal')` → INSERT in `user_memory_facts`. Hartes Schema, 4-stufiger MDR-Schutz (Kategorie-Regeln → Consent → Scope → Medizin-Blocklist) wie in Mig 122 Design.

---

## Task C5: Onboarding-API `/api/ai/onboarding/turn`

**Files:**
- Create: `app/api/ai/onboarding/turn/route.ts`
- Test: analog

Ein Turn im Wizard: Server bekommt User-Input → ruft KI mit System-Prompt + Memory-State → verarbeitet tool_calls (save_memory) → Response zurück.

**Prompt-Caching:** System-Prompt mit `cache_control: { type: "ephemeral" }` für Claude (5 min TTL, -90% Input-Kosten).

---

## Task C6: Onboarding-Wizard Frontend

**Files:**
- Create: `app/(senior)/onboarding/page.tsx` + Sub-Components
- Test: Playwright E2E

7 Schritte, jeder mit großem Text + TTS + „Weiter"-Button + „Später"-Button.

---

## Task C7: Memory-Übersicht Senior-Seite

**Files:**
- Create: `app/(senior)/profil/memory/page.tsx`
- Test: E2E

Liste aller Memory-Facts nach Kategorie, Löschen per Tap (DSGVO Art. 17).

---

## Task C8: Memory-Edit Angehörigen-Seite

**Files:**
- Create: `app/(app)/care/meine-senioren/[id]/memory/page.tsx`
- Test: E2E

---

## Task C9: Welle C Deploy + Smoke-Test

E2E Pilot-Senior macht Onboarding mit Claude → Memory-Facts sichtbar → Angehöriger kann editieren.

---

# Welle D — Care-Access + Notfall-Public

## Task D1: Migration 174 — `care_access_audit`

```sql
create table if not exists public.care_access_audit (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid references auth.users,
  scanner_id uuid references auth.users,
  access_type text not null,    -- 'family' | 'individual_caregiver' | 'care_company'
  action text not null,          -- 'scan' | 'read_memory' | 'write_note' | ...
  details jsonb,
  created_at timestamptz default now()
);
alter table public.care_access_audit enable row level security;
-- Policies: senior sees own, scanner sees own scans
```

## Task D2: QR-Token für Senior (Scan-Einstieg)

Lib `lib/care-access/scan-token.ts` — analog Pairing-Token, aber 5 min TTL, Payload `{senior_id, session_id}`.

## Task D3: API `/api/care/access/claim` (Scanner scannt)

POST mit Scan-Token + Scanner-Auth → prüft caregiver_links → falls nicht, Senior-Gerät bekommt Push/Realtime „Bestätigung nötig" → nach Tap neuer caregiver_link.

## Task D4: QR-Scan-Component (Angehörigen-App)

Capacitor Camera Plugin + MLKit Barcode-Scan → POST claim.

## Task D5: Senior-Profile-Button „Jemand möchte mich besuchen"

Großer Button → Vollbild-QR (rotiert alle 5 min).

## Task D6: Öffentliche Notfall-Seite `/notfall/[token]`

Lädt verschlüsseltes Level-1-Feld aus `emergency_profiles`, zeigt Allergien + Medis + Notfallkontakt (Anruf-Button).

## Task D7: Opt-In-Panel für Notfall-Karte

`app/(senior)/profil/notfall/page.tsx` — Toggles je Feld, Token-Rotation-Button.

## Task D8: E2E-Test + Deploy

---

# Welle E — Native Wrapper (Windows + Android + iOS)

## Task E1: Tauri 2.x Windows Projekt aufsetzen

**Files:**
- Create: `nachbar-senior-windows/` (neues eigenes Repo oder im Monorepo)
- `src-tauri/tauri.conf.json`: lädt `https://nachbar-io.vercel.app/senior/home` in Fullscreen, gestattet nur diese Domain.

**Plugins:** `tauri-plugin-shell` (für `tel:`-Links), `tauri-plugin-notification`.

Build: `cargo tauri build --target x86_64-pc-windows-msvc` → `.msi`-Installer.

## Task E2: Capacitor Sync + Plugins

**Files:**
- Modify: `nachbar-io/capacitor.config.ts` — `server.url` auf Prod-Domain, `server.allowNavigation` restriktiv.
- Modify: `nachbar-io/package.json` — Plugins: `@capacitor/camera`, `@capacitor/barcode-scanner`, `@capacitor/push-notifications`, `@capacitor/device`.

```bash
npm install @capacitor/camera @capacitor/barcode-scanner
npx cap sync
```

## Task E3: Kamera-Plugin-Abstraktion

**Files:**
- Create: `lib/native/camera.ts` — Wrapper der auf Capacitor-Plugin (Mobile) oder `navigator.mediaDevices.getUserMedia` (Web) fällt.

## Task E4: Device-ID Abstraktion

**Files:**
- Create: `lib/native/device-id.ts` — Capacitor Device.getId() oder Fallback-UUID.

## Task E5: Tauri Kamera-Bridge

Über `tauri-plugin-shell` kann Tauri Windows-eigene Kamera-APIs nicht einfach ansprechen. Workaround: Kamera-Scan läuft im Web (`getUserMedia`), Tauri gibt nur Permission-Hook frei.

## Task E6: Android Build + Internal Testing Upload

- `cd android && ./gradlew bundleRelease`
- Play Console: neuer App-Release in Internal Testing Track.
- Privacy Policy + Data-Safety Form ausgefüllt.

## Task E7: iOS Build + TestFlight Upload

- Xcode → Archive → TestFlight.
- App-Store-Connect: App-Information + Privacy Nutrition Label.

## Task E8: Windows Installer Code-Signing + Distribution

- EV Code-Signing-Cert (optional für Pilot, für Prod nötig).
- `.msi` auf nachbar-io.vercel.app/download/senior-windows.msi (öffentlich, hinter Login?).

## Task E9: Smoke-Test-Checklist

Alle 3 Wrapper installieren, durchs komplette Pairing laufen, einen KI-Turn machen, Care-Access-Scan + Notfall-Scan testen.

---

# Rote Zone (Founder-Go Checkpoints)

- **Ende Welle A:** Push + Prod-Migrationen 171
- **Ende Welle B:** Push + Prod-Migration 172 + DEVICE_PAIRING_SECRET env-var in Vercel + Upstash
- **Ende Welle C:** Push + Prod-Migration 173 + ANTHROPIC_API_KEY + MISTRAL_API_KEY env-vars
- **Ende Welle D:** Push + Prod-Migration 174
- **Welle E:** Play-Account $25, Apple-Cert, Windows-Cert

# AVV-Unterschriften (vor Welle C Deploy)

- Anthropic: https://www.anthropic.com/legal/dpa
- Mistral: https://mistral.ai/terms/#data-processing-addendum

---

## Verifikations-Checkliste Release 1 komplett

- [ ] Wrappers Win/Android/iOS installierbar
- [ ] QR-Pairing Funktion auf allen 3 Plattformen
- [ ] 6-Monat-Refresh-Token bleibt nach Reboot
- [ ] Claude-Onboarding funktioniert (deutsch, 7 Schritte, TTS)
- [ ] Memory-Facts werden verschlüsselt gespeichert (care_need, personal)
- [ ] Angehöriger-QR-Scan verknüpft caregiver_link
- [ ] Notfall-Public `/notfall/<token>` zeigt Allergien + Medis + Anruf-Button
- [ ] Admin-UI zeigt beide Gruppen (Gesundheit + Care-Access)
- [ ] AVV-Verträge unterschrieben
- [ ] Google Play Internal Testing aktiv
- [ ] TestFlight aktiv
- [ ] AWOW mit Windows-Installer lauffähig bei Thomas zu Hause

## Rollback je Welle

- Welle A: Flags auf Default setzen, Code-Revert.
- Welle B: `device_refresh_tokens` komplett drop + auth.users wieder über Magic-Link.
- Welle C: `AI_PROVIDER=off` schaltet KI scharf ab.
- Welle D: `CARE_ACCESS_FAMILY=false` sperrt QR-Scan.
- Welle E: App-Store-Release zurückziehen, aber Web bleibt erreichbar.
