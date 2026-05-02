# Handover 2026-05-02 — Chat Notification + 406/403 Hygiene

Stand: 2026-05-02 nach gezielter S12-Triage und lokalem Commit `630fe9e`.

## Harte Linien

- Kein Deploy wurde ausgefuehrt.
- Kein Push wurde ausgefuehrt.
- Kein Prod-DB-Write, keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Feature-Flag-/Preset-Schalter.
- Keine echten Pflege-/Medizin-/Personendaten.
- Lokale Tests nutzten synthetische E2E-Testdaten gegen lokalen Supabase-Stack.

## Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Status vor dieser Handover-Doku: `master...origin/master [ahead 1]`
- Lokaler Fix-Commit: `630fe9e fix(chat): allow contact notification delivery`
- Letzter Remote-Commit: `d9e84c9 docs(handoff): record green e2e ci status`

## Was gefixt wurde

### 403 bei Chat-Notifications

Root Cause:

- 1:1-Chats sind seit Mig 161 kontaktbasiert (`contact_links.status = 'accepted'`).
- `lib/services/notifications.service.ts` kannte als erlaubte Beziehung aber nur Admin, gleicher Haushalt, Caregiver-Link und gleiches Quartier.
- Ergebnis: Chat war erlaubt, aber `/api/notifications/create` blockierte beim S12-Chat teils mit `403 Keine Berechtigung fuer diesen Empfaenger`.

Fix:

- `checkUserRelationship()` erlaubt jetzt auch akzeptierte `contact_links` in beide Richtungen.
- Der bestehende Quartier-Check bleibt als Fallback erhalten.

### 406-Console-Noise im S12-Flow

Gefundene 406-Quellen per Response-Probe:

- `household_members?select=households(quarter_id)&...&limit=1` aus `lib/quarters/quarter-context.tsx`
- `users?select=display_name,avatar_url&id=eq.<peer>` aus Messages-UI

Fix:

- Optionale Profilreads in `app/(app)/messages/page.tsx` und `app/(app)/messages/[id]/page.tsx` nutzen jetzt `maybeSingle()`.
- Optionale Haushaltsmitgliedschaft in `lib/quarters/quarter-context.tsx` nutzt jetzt `maybeSingle()`.
- Semantik bleibt gleich: fehlende optionale Daten fuehren zu Fallback/Null, nicht zu sichtbaren Supabase-406-Errors.

## Geaenderte Dateien

- `lib/services/notifications.service.ts`
- `app/(app)/messages/page.tsx`
- `app/(app)/messages/[id]/page.tsx`
- `lib/quarters/quarter-context.tsx`
- `app/api/notifications/create/route.test.ts`
- `__tests__/app/messages/page.test.tsx`
- `__tests__/app/messages/chat-page.test.tsx`
- `lib/quarters/__tests__/quarter-context.test.tsx`

## Verifikation

RED bestaetigt:

- Neuer Notification-Test schlug vor Fix mit `403 statt 200` fehl.
- Neuer ChatPage-Test sah `.single()` statt `maybeSingle()`.
- Neuer MessagesPage-Test sah `.single()` statt `maybeSingle()`.
- Neuer QuarterProvider-Test sah `.single()` statt `maybeSingle()`.

GREEN danach:

```powershell
npx vitest run app/api/notifications/create/route.test.ts lib/notifications.test.ts __tests__/app/messages/page.test.tsx __tests__/app/messages/chat-page.test.tsx lib/quarters/__tests__/quarter-context.test.tsx
```

Ergebnis: 5 Dateien / 22 Tests passed.

```powershell
npx eslint 'lib/services/notifications.service.ts' 'app/(app)/messages/page.tsx' 'app/(app)/messages/[id]/page.tsx' 'app/api/notifications/create/route.test.ts' '__tests__/app/messages/page.test.tsx' '__tests__/app/messages/chat-page.test.tsx' 'lib/quarters/quarter-context.tsx' 'lib/quarters/__tests__/quarter-context.test.tsx' --no-warn-ignored
npx tsc --noEmit
npm run build:local
```

Ergebnis: ESLint gruen, TypeScript gruen, `build:local` gruen.

S12 lokal gegen `start:local` auf Port 3001:

```powershell
$env:E2E_BASE_URL="http://localhost:3001"
$env:E2E_LIVE="true"
$env:E2E_CLEANUP="true"
$env:E2E_TEST_SECRET="e2e-test-secret-dev"
npx playwright test --config=tests/e2e/playwright.config.ts tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts --workers=1 --timeout=60000
```

Ergebnis: 3 passed. Im finalen Lauf keine vorherigen 406/403-Console-Errors mehr im S12-Testoutput.

## Bekannte lokale Test-Noise

Im `start:local`-Log sichtbar, aber nicht S12-blockierend:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
- Upstash Redis nicht konfiguriert, Security-Scoring lokal fail-open
- Push fehlgeschlagen `503`, weil lokale Testnutzer keine Push-Subscription haben

Diese Meldungen wurden nicht angefasst und sind keine Prod-Aenderung.

## Aktueller Betriebszustand

- Port 3001 wurde nach den Tests gestoppt.
- Lokaler Supabase-Stack lief waehrend der Tests.
- Kein Remote-Deploy, kein Push.
- Nach dem Fix-Commit war der Arbeitsbaum clean bis zur Erstellung dieser Handover-Doku.

## Naechste sinnvolle Schritte

1. Nach dieser Handover-Doku lokal committen.
2. Danach Status: `master...origin/master [ahead 2]` erwartet.
3. Wenn Thomas explizit Push-Go gibt: `git push origin master`.
4. Danach GitHub Actions abwarten, besonders `E2E Multi-Agent Tests`.
5. Erst nach gruener CI erneut ueber Deploy/Production-Smoke entscheiden.

## Nicht vergessen

- Push/Deploy bleibt rote Zone ohne klares Founder-Go.
- Keine Prod-DB- oder Vercel-Env-Arbeit aus diesem Handover ableiten.
- Wenn spaeter wieder 406 auftauchen: zuerst konkrete Response-URLs sammeln, nicht pauschal `.single()` codebase-weit ersetzen.
