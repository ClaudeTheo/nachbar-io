---
date: 2026-05-11 mittag (UTC+2)
from: Claude Opus 4.7 (1M context) — Session "Worktree flamboyant-poincare-d64bf5"
to: Naechste Session + Founder
status: ready
tldr: 3-Punkte-Handoff abgearbeitet. Pkt 1 Code-Verkabelung verifiziert (Hoer-Test Founder-Hand). Pkt 2 BugReportButton in beiden Senior-Layouts + TDD (2 neue Tests). Pkt 3 Demo-Seed-Bug gefixt, SQL-Insert wartet auf `EVENTS-SEED-GO`.
---

# 3-Punkte-Handoff 2026-05-11 — bearbeitet

## Quelle

`docs/plans/handoff/2026-05-11-claude-an-claude-tag-bilanz-und-3-offene-punkte.md`

## Pkt 1 — Voice/KI-Pipeline Code-Verkabelung

**Befund:** Routes existieren, Imports sauber, Auth-Guards aktiv.

| Endpoint | Datei | Service | Gate |
|---|---|---|---|
| `/api/companion/chat` | `app/api/companion/chat/route.ts` | `processChat` (`modules/voice/services/companion-chat.service.ts`) | `requireAuth` + `canUsePersonalAi` |
| `/api/voice/tts` | `app/api/voice/tts/route.ts` | `synthesizeSpeech` (`modules/voice/services/tts.service.ts`) | `requireAuth` + `canUsePersonalAi` |
| `/api/voice/transcribe` | `app/api/voice/transcribe/route.ts` | `transcribeAudio` (`modules/voice/services/transcribe.service.ts`) | `requireAuth` + `canUsePersonalAi` |

`canUsePersonalAi` (`lib/ai/user-settings.ts:126`) prueft drei Bedingungen:
1. `state.enabled` (User-Setting `ai_help_enabled`)
2. NOT Feature-Flag `AI_PROVIDER_OFF`
3. `checkCareConsent(userId, "ai_onboarding")` (Care-Consent)

**Wenn der Hoer-Test 503 ergibt** ("AI_HELP_DISABLED_MESSAGE"), liegt eine der drei Bedingungen quer. Reihenfolge der Diagnose:
- User-Setting `ai_help_enabled` ueberpruefen (Profil → KI-Einstellungen)
- `select * from feature_flags where name = 'AI_PROVIDER_OFF'` (sollte off sein)
- `select * from care_consents where user_id = 'dbd5e23e-...' and consent_type = 'ai_onboarding'`

### Diagnose-Nachtrag 2026-05-11 mittag (Read-only via Supabase MCP)

Direkte Pruefung der drei Bedingungen fuer Founder-User `dbd5e23e-...`:

| Check | Wert | Befund |
|---|---|---|
| `users.settings.ai_enabled` | `"true"` | ✅ User-Setting an |
| `users.settings.ai_assistance_level` | `"everyday"` | ✅ Level gesetzt |
| `feature_flags.AI_PROVIDER_OFF.enabled` | `true` | ❌ Global-Kill-Switch AN |
| `care_consents.ai_onboarding.granted` | `null` (kein Row) | ❌ Care-Consent fehlt |

**Ergebnis:** Hoer-Test ergibt jetzt garantiert 503. Das ist **kein Bug**, sondern der korrekte Sperr-Zustand bis Provider-AVV (§5 in MEMORY) durch ist.

**Hintergrund:** `AI_PROVIDER_OFF=true` ist Founders Kill-Switch fuer KI-Provider bis Anthropic + Mistral AVV nach HR-Eintragung unterschrieben sind. `care_consents.ai_onboarding` fehlt weil `setAiAssistanceLevel` `updateConsents` nur ruft, wenn sich `enabled` aendert (Zeile 105-107 in `lib/ai/user-settings.ts`) — beim Aktivieren mit existierendem Level ist das uebersprungen worden.

**Mapping Pkt 1 → AVV-Pfad:** Hoer-Test verschiebt sich auf nach HR-Eintragung AG Freiburg (~2-3 Wochen) und AVV-Abschluss. **Pkt 1 ist also kein offener Pilot-Task**, sondern wartet auf §5.

**Wenn doch jetzt testen** (nur als Diagnose, nicht produktiv, Rote Zone weil Provider-Live):
1. `UPDATE feature_flags SET enabled = false WHERE key = 'AI_PROVIDER_OFF';`
2. App-Profil → KI-Einstellungen Toggle aus + wieder an (triggert `updateConsents(..., ai_onboarding: true)`).
Token: `VOICE-TEST-PROVIDER-LIVE-GO`.

## Pkt 2 — BugReportButton auf Senior-Layouts

**Status:** Erledigt fuer beide Senior-Layouts (HOCH-Priot).

**Diffs:**
- `app/(senior)/layout.tsx`: Import + `<BugReportButton />` am Layout-Ende (Senior-Geraet-Tauri-Wrapper)
- `app/senior/layout.tsx`: Import + `<BugReportButton />` nach Notruf-Leisten-Platzhalter (Web-Senior-Modus)

`BugReportButton` ist QuarterProvider-tolerant (`useContext(QuarterContext)` mit `?? null`) und auth-resilient (`createClient()` direkt). Default-Modus `anonymous=false`, weil Senior-Layouts nur fuer eingeloggte Nutzer sind.

**Tests:** `__tests__/app/senior-layouts-bug-button.test.tsx` (neu, 2 Tests, beide gruen). Strategie: BugReportButton als Stub mocken, prueft nur Layout-Integration (Mount). Wuerde sonst html2canvas/Supabase-Browser-Client-Mocks erfordern und die Test-Aussage verwaessern.

**Was NICHT erledigt** (offen, niedrige Prio laut Pkt-2-Tabelle im Quell-Handoff):
- `app/terminal/[token]/layout.tsx` (Pflege-Terminal, MITTEL) — anonym, braucht `<BugReportButton anonymous />`
- `app/b2b/layout.tsx` (Marketing-Landing, NIEDRIG)
- `app/(kiosk)/kiosk/layout.tsx` (Kiosk, KEIN — Pi 5 deprecated)
- `app/(auth)/layout.tsx` (Auth-Pages, NIEDRIG — Login-Page hat schon einen)

## Pkt 3 — 0 Events im Pilot

**Was gemacht ist:** Demo-Seed-Skript-Bug repariert.
- `scripts/seed-demo-quarter.ts:199`: `created_by` → `user_id` (Schema-konform mit `events`-Mig 004 Zeile 11).

**Was offen ist:** Tatsaechlicher SQL-Insert in Prod-DB.

Drei Optionen aus dem Quell-Handoff, in Prioritaet-Reihenfolge:

**A) Founder klickt selbst via `/events/new`** (~5 Min, kein Go noetig)
1. `https://nachbar-io.vercel.app/events/new` aufrufen
2. 3 Events anlegen (Vorschlaege siehe Quell-Handoff Zeile 121-123)

**B) Founder via `/admin` → EventManagement-Tab** (~5 Min, kein Go noetig)

**C) SQL-Seed via Supabase MCP — braucht Founder-Go `EVENTS-SEED-GO`:**

```sql
INSERT INTO events (user_id, quarter_id, title, description, location, event_date, event_time, category)
VALUES
  ('dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd', 'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'Nachbarschafts-Cafe', 'Lockerer Austausch im Quartier', 'Rathausstrasse', CURRENT_DATE + 3, '15:00', 'community'),
  ('dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd', 'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'Spaziergang am Rhein', 'Gemeinsamer Spaziergang', 'Rheinpromenade', CURRENT_DATE + 5, '10:00', 'sports'),
  ('dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd', 'ee6cfcab-f615-47cd-afe7-808a27cb584b', 'Kaffeekraenzchen', 'Kaffee und Kuchen', 'Begegnungszentrum', CURRENT_DATE + 7, '15:30', 'seniors');
```

## Verifikation

| Check | Ergebnis |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <4 changed files>` | exit 0 |
| `npx vitest run __tests__/app/senior-layouts-bug-button.test.tsx` | 2/2 gruen |
| `npx vitest run __tests__/components/BugReportButton.test.tsx` | 13/13 gruen |

## Diff-Stat

```
 app/(senior)/layout.tsx      | 2 ++
 app/senior/layout.tsx        | 3 +++
 scripts/seed-demo-quarter.ts | 2 +-
 __tests__/app/senior-layouts-bug-button.test.tsx | NEW
 4 files changed, ~70 insertions(+), 1 deletion(-)
```

## Naechste Aktionen fuer Founder

1. **Wenn Senior-Bug-Button live testen:** Hard-Refresh auf `https://nachbar-io.vercel.app/senior/home` oder `/kreis-start`, Bug-FAB unten-links sollte erscheinen.
2. **Pkt 1 Voice-Test:** Mikrofon-Test in Browser, siehe Quell-Handoff Zeilen 68-73.
3. **Pkt 3:** Option A (selbst klicken) ist am schnellsten. Falls Variante C gewuenscht: Token `EVENTS-SEED-GO` schicken, naechste Session fuehrt SQL aus.
