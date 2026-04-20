# Baustein 1 — Bestandsaufnahme Tests + tsc (Bericht)

**Datum:** 2026-04-21
**Session-Modell:** Sonnet 4.7
**Ausgangs-HEAD:** `677d320` (35 Commits seit `5de2a58`, kein Push)
**Ziel:** Ehrliche Liste: gruen / rot / skipped mit Ursache. **Kein Code geaendert.**

---

## Executive Summary

| Suite | Ergebnis | Bewertung |
|---|---|---|
| **Vitest** (Unit + Integration) | 4 Files failed / 440 passed (444 gesamt) · 4 Tests failed / 3464 passed (3468 gesamt) · 13 Worker-Spawn-Errors | Grun-dominant. 4 echte Failures, alle klar diagnostiziert. **Kein Kill-Kriterium** (> 20 Failures) ausgeloest. |
| **tsc --noEmit** | 9 Errors (2 in `__tests__/`, 6 in `tests/e2e/cross-portal/`, 1 in `tests/e2e/scenarios/`) | Prod-Code sauber. Alle Fehler in Test-Dateien, vorwiegend Supabase-Return-Type-Schwaechen. |
| **E2E Smoke (S7)** | 11 passed + 1 flaky (S7.11 Retry grun) | Smoke-Lauf OK. Ein Navigation-Race, nicht reproduzierbar beim Retry. |
| **@ts-expect-error / @ts-ignore** | 0 Treffer im Produktiv-Code | Keine verstecke Skip-Liste vorhanden. |

**Entscheidungs-Empfehlung:** B2 + B3 beide in dieser Woche machbar. Realistisch zusammen 1-1.5 Sessions. Kein Grund, den Plan zu aendern.

---

## 1. Vitest — Unit + Integration

**Output-Datei:** [2026-04-21-baustein-1-vitest-output.txt](2026-04-21-baustein-1-vitest-output.txt) (408 Zeilen)

**Kommando:** `npm run test` (entspricht `vitest run`)

**Zusammenfassung:**
- Test Files: **4 failed | 440 passed** (444)
- Tests: **4 failed | 3464 passed** (3468)
- Unhandled Errors: **13** (alle Windows-spezifische `spawn UNKNOWN` / `EPIPE` / `VirtualAlloc failed` — Worker-Fork-Probleme, **keine Test-Failures**)
- Duration: 123 s

### 1.1 Echte Failures (4)

| File | Test | Ursache | Kategorie | Fix-Aufwand |
|---|---|---|---|---|
| `__tests__/integration/care-consent-flow.test.ts:9` | "hat 5 Features in allen Definitionen" | `CARE_CONSENT_FEATURES` enthaelt seit Welle C 6 Eintraege (`sos`, `checkin`, `medications`, `care_profile`, `emergency_contacts`, `ai_onboarding`); Test prueft hardcoded `toHaveLength(5)` | **Test-Bug** (Welle C ergaenzte Konstante, Test nicht mitgezogen) | ~5 min (3 Zahlen anpassen + `toContain('ai_onboarding')`) |
| `__tests__/lib/care/consent-types.test.ts:6` | "definiert 5 Consent-Features" | Gleiche Ursache wie oben | **Test-Bug** | ~5 min |
| `__tests__/lib/care/consent.test.ts:83` | "mappt alle 5 Features" | `CONSENT_FEATURE_TO_API_ROUTES` hat 6 Keys; Test prueft `toHaveLength(5)` | **Test-Bug** | ~5 min |
| `__tests__/api/care/sos/sos-detail.test.ts:81` | "gibt einzelnen SOS-Alert mit Antworten zurueck (200)" | Test ruft Route-Handler, dieser ruft `getAdminSupabase()` → wirft `SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert` → 500 statt 200 | **Test-Bug / Test-Env-Luecke** (Service-Role-Mock fehlt; bekannt aus `.claude/rules/testing.md`) | ~15-30 min (Admin-Client mocken ODER `SUPABASE_SERVICE_ROLE_KEY=dummy` in `vitest.setup.ts`) |

**Pre-Check-Erkenntnis:** MEMORY.md (`project_test_status.md`) listete 4 Failures als *"sos-detail, billing-checkout, hilfe/tasks x2"*. **Realitaet weicht ab:**
- ✅ `sos-detail` bestaetigt
- ❌ `billing-checkout` ist **nicht** in den 4 Failures (nur in den 7 Worker-Spawn-Errors)
- ❌ `hilfe/tasks` ist **nicht** in den 4 Failures (auch nur in Worker-Spawn-Errors)
- ⚠️ **3 neue Failures** durch Welle C (`ai_onboarding` als 6. Consent-Feature) — Memory war veraltet.

### 1.2 Worker-Spawn-Errors (13, Windows-spezifisch)

**Kategorie:** Infrastruktur-Flaky (nicht Test-Failures).

Betroffene Test-Files (alle 7 sind in den 440 passed enthalten — Vitest hat retry'd oder parallel anderen Worker verwendet):

| File | Fehler |
|---|---|
| `__tests__/api/billing-checkout.test.ts` | `spawn UNKNOWN` + `write EPIPE` |
| `__tests__/components/hilfe/SubscriptionManager.test.tsx` | `spawn UNKNOWN` |
| `__tests__/components/moderation-dialog.test.tsx` | `spawn UNKNOWN` |
| `__tests__/components/VoiceAssistantFAB.test.tsx` | `spawn UNKNOWN` |
| `modules/care/components/checkin/CheckinDialog.test.tsx` | `spawn UNKNOWN` |
| `modules/care/components/appointments/AppointmentCalendar.test.tsx` | `spawn UNKNOWN` |
| `modules/care/components/tasks/TaskCard.test.tsx` | `spawn UNKNOWN` |

Zusaetzlich: `[low_level_alloc.cc] VirtualAlloc failed` — der Host war kurz RAM-knapp beim parallelen Fork.

**Nicht kritisch**, aber wert in B3 oder separatem Ticket aufzunehmen: Vitest-Config koennte `pool: 'threads'` statt `forks` nutzen, oder `fileParallelism: false` fuer diese Files. Nicht Teil von B2.

---

## 2. tsc — Typ-Check

**Output-Datei:** [2026-04-21-baustein-1-tsc-output.txt](2026-04-21-baustein-1-tsc-output.txt)

**Kommando:** `npx tsc --noEmit`

**Zusammenfassung:** 9 Errors, alle in Test-Dateien. Produktiv-Code sauber.

| Datei:Zeile | Fehler | Kategorie | Fix-Aufwand |
|---|---|---|---|
| `__tests__/lib/security/device-fingerprint.test.ts:267` | `Conversion of type '{ zrange: Mock; zremrangebyscore: Mock; }' to type 'Redis'`, 176+ fehlende Properties | **Konservativer Typ** (Test-Mock, Redis-Full-Interface ueberfluessig) | ~5 min (`as unknown as Redis`) |
| `__tests__/pages/quartier-info-vorlesen.test.tsx:170` | `Type 'null' is not assignable to type '{ id, name, center_lat, center_lng, zoom_level }'` | **Konservativer Typ** (Test nutzt `null` als Fixture) | ~5 min (Typ-Cast oder echtes Fixture) |
| `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts:134` | `Property 'display_name' does not exist on type 'never'` | **Supabase-Return-Type** (nach `.single()` / `.maybeSingle()` ohne typed schema ist Return `never`) | ~10 min (Schema-Typ via `Database['public']['Tables']['...']` oder Inline-Cast) |
| `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts:135` | `Property 'last_checkin_status' does not exist on type 'never'` | **Supabase-Return-Type** | Teil des Fix oben |
| `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts:136` | `Property 'last_checkin_at' does not exist on type 'never'` | **Supabase-Return-Type** | Teil des Fix oben |
| `tests/e2e/cross-portal/x19-postfach-thread.spec.ts:428` | `Property 'messages' does not exist on type 'never'` | **Supabase-Return-Type** | ~5 min |
| `tests/e2e/cross-portal/x19-postfach-thread.spec.ts:429` | `Property 'messages' does not exist on type 'never'` | **Supabase-Return-Type** | Teil des Fix oben |
| `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts:92` | `Argument of type 'string \| null' is not assignable to parameter of type 'string'` | **Konservativer Typ** (non-null Assertion oder Guard fehlt) | ~5 min |

**Kategorie-Breakdown:**
- 6× Supabase-Return-Type (E2E-Specs ohne generierte Schema-Typen)
- 3× konservativer Typ (Mocks / Fixtures / non-null)
- **0× echte Bugs** (alle Fehler hindern Test-Laufzeit-Logik nicht)

**`@ts-expect-error` / `@ts-ignore` im Produktiv-Code:** 0 Treffer (via Grep). Die in MEMORY.md erwaehnte "8er Skip-Liste" existiert nicht als Kommentar-Flags, sondern als **unbehandelte** tsc-Fehler in E2E-Dateien (9 vs. 8 — leicht abweichend von Memory, vermutlich durch 1 neuen Error seit letzter Zaehlung).

---

## 3. E2E Smoke

**Output-Datei:** [2026-04-21-baustein-1-e2e-smoke.txt](2026-04-21-baustein-1-e2e-smoke.txt) (131 Zeilen)

**Kommando:** `npm run test:e2e:smoke` (Playwright `--project=smoke`, Test-File `scenarios/s7-smoke.spec.ts`)

**Zusammenfassung:** 12 Tests, 4 Workers, Dauer 48.5 s.
- **11 passed** (davon 1 nach Retry grun)
- **1 flaky:** S7.11 — *"CSS laed korrekt (kein unstyled Content)"*: `page.evaluate: Execution context was destroyed, most likely because of a navigation`. Retry #1 grun.

**Bewertung:** Kein echtes Regression-Signal. Der Navigation-Race in S7.11 tritt sporadisch auf, weil `page.evaluate` mit einer gleichzeitig laufenden Navigation kollidiert. **Nicht B2-relevant**, aber als Kandidat fuer B5/B6 notieren (entweder `waitForLoadState('networkidle')` vor evaluate oder auf Smoke-Stable-Tag setzen).

---

## 4. Empfehlung fuer Baustein 2 und Baustein 3

### 4.1 Reihenfolge

**Vorgeschlagene Session-Reihenfolge:**

1. **B2 Mini-Session (1 Session, ~1-1.5 h):** Die 3 Consent-Tests + sos-detail. Alle Ursachen sind bekannt, Fix ist mechanisch.
2. **B3 (1 halbe bis ganze Session):** 9 tsc-Errors in Test-Dateien. Typ-Casts / Schema-Typen einziehen.
3. **Optionaler Zusatz:** Vitest-Worker-Errors (Windows) als separates Ticket — entweder Config-Tweak (`pool: 'threads'` oder `fileParallelism: false` fuer Komponententests) oder als "wird auf CI/Mac irrelevant" dokumentieren.

### 4.2 B2 — Fix-Reihenfolge (empfohlen)

| # | Test | Fix | Tsc-Risiko |
|---|---|---|---|
| 1 | `consent-types.test.ts` | `toHaveLength(5)` → `toHaveLength(6)`, `toContain('ai_onboarding')` ergaenzen | 0 |
| 2 | `consent.test.ts` | Gleiche Aenderung wie oben fuer `CONSENT_FEATURE_TO_API_ROUTES` | 0 |
| 3 | `care-consent-flow.test.ts` | Gleiche Aenderung fuer 3 Expects (`CONSENT_FEATURES`, `CARE_CONSENT_FEATURES`, `CARE_CONSENT_LABELS`) | 0 |
| 4 | `sos-detail.test.ts` | Entweder `SUPABASE_SERVICE_ROLE_KEY=dummy` in `vitest.setup.ts` globaler Env-Patch, ODER `vi.mock("@/lib/supabase/admin", ...)` im Test-File | 0 (isoliert) |

**Risiko:** Pre-Check vor jedem Fix. Insbesondere bei (4) muss gecheckt werden, ob andere Tests von `getAdminSupabase` abhaengen (Grep-Pflicht vor Env-Patch). Falls ja: Test-File-lokaler Mock statt globaler Env-Patch.

**Abbruchkriterium:** Wenn ein Fix Seiten-Effekte auf andere Tests hat, einzelnen Test-Lauf reverten und neu diskutieren.

### 4.3 B3 — Fix-Reihenfolge (empfohlen)

| # | Datei | Strategie |
|---|---|---|
| 1 | `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts:134-136` | `.single<Database['public']['Tables']['users']['Row']>()` oder lokales `type User = { display_name: string; last_checkin_status: string; last_checkin_at: string }` |
| 2 | `tests/e2e/cross-portal/x19-postfach-thread.spec.ts:428-429` | Analog |
| 3 | `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts:92` | Non-null assertion oder Guard `if (!x) throw new Error(...)` |
| 4 | `__tests__/lib/security/device-fingerprint.test.ts:267` | `as unknown as Redis` |
| 5 | `__tests__/pages/quartier-info-vorlesen.test.tsx:170` | Typ-Cast auf Fixture, oder echtes Objekt mit 0-Werten |

**Risiko:** Kaskaden-Effekt durch Schema-Typ-Import. Wenn `Database`-Generierung (Welle-C-Drift) divergiert, kann 1 Fix Folgefehler schaffen. **Abbruchkriterium im Plan:** bei Kaskade > 30 min zurueckrollen und `// @ts-expect-error: <Grund>` setzen.

### 4.4 "Nicht in dieser Runde"

- **Vitest Worker-Spawn-Errors (Windows):** nicht in B2/B3. Als separates Ticket — *"vitest.config pool/fileParallelism anpassen"*. Betrifft nur lokal auf Windows, CI laeuft auf Linux.
- **E2E Smoke S7.11 Flaky:** nicht in B2/B3. Entweder in B5 (neue E2E-Welle) oder separat in eigenem Commit.
- **B4 Walkthrough-Stolperstellen:** erst nach B2/B3, wenn Test-Baseline sauber ist. Vermeidet Doppel-Arbeit wenn Founder durch einen Consent-Flow klickt, der gerade im Umbau ist.

---

## 5. Signal-Kriterien vs. Plan

| Kill-Kriterium (Plan) | Realitaet |
|---|---|
| Vitest > 20 Failures → Stopp, neu entscheiden | 4 Failures → **nicht ausgeloest** |
| B2 ein Test > 2 h → Stopp | Noch offen, erst in B2-Session messbar |
| B3 Kaskade > 30 min → Zurueckrollen | Noch offen |

**Fazit:** Plan bleibt wie beschlossen. Morgen (oder heute nachmittag) B2 starten. Opus 4.7 empfohlen ab B2 (Multi-File-Fixes).

---

## 6. Offene Fragen an Founder

Keine Blocker. Nur zwei kleine Entscheidungen, die in B2 selbst gefaellt werden koennen:

- **sos-detail-Fix:** Globaler `.env.test`-Patch (`SUPABASE_SERVICE_ROLE_KEY=dummy`) vs. Test-File-lokales `vi.mock`? (Default-Empfehlung: lokaler Mock, weil keine anderen Tests beruehrt werden.)
- **Worker-Spawn-Errors aufnehmen?** Ja/Nein als eigenes Ticket ausserhalb Haertungs-Runde — lokal nervig, CI-unkritisch.

---

**Berichts-Autor:** Claude Sonnet 4.7 (B1-Session, 2026-04-21)
**Naechster Schritt:** B2-Session starten (empfohlenes Modell: Opus 4.7).
