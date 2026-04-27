# Codex-Uebergabe fuer frische Session - Nachbar.io

Stand: 2026-04-27 nach Notartermin / Geschaeftskonto-Start

Arbeitsverzeichnis:

`C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Wichtigste Orientierung

Dies ist die echte Nachbar.io-Codebase, nicht der Doku-Ordner unter `C:\Users\thoma\Documents\New project\nachbar-io`.

Vor Arbeit in frischer Session lesen:

1. `C:\Users\thoma\Documents\New project\AGENTS.md`
2. `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\00_Start-hier.md`
3. `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\02_Projekte\Nachbar-io.md`
4. `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\01_Firma\GmbH-und-Recht.md`
5. `C:\Users\thoma\Claud Code\Handy APP\CLAUDE.md`
6. `C:\Users\thoma\.claude\projects\C--Users-thoma-Claud-Code-Handy-APP\memory\MEMORY.md`
7. `C:\Users\thoma\.claude\projects\C--Users-thoma-Claud-Code-Handy-APP\memory\project_session_handover.md`
8. Diese Datei.

## Rote Linien

- Kein `git push origin master` ohne ausdruecklichen Founder-Go.
- Kein Deploy / Vercel-Unpause ohne ausdruecklichen Founder-Go.
- Keine Prod-DB-Schreibvorgaenge, keine Migrationen, kein Cleanup-Execute.
- Keine Secrets lesen oder ausgeben, keine `.env*`-Inhalte anzeigen.
- Kein Billing, keine neuen laufenden Kosten.
- Keine echten Pilotnutzer / echten personenbezogenen Inhalte, solange HR/AVV/DPA nicht geklaert sind.

## GmbH-/Founder-Stand

- Notartermin Stadler war am 27.04.2026.
- Theobase GmbH wurde beurkundet; Handelsregistereintragung steht noch aus.
- Geschaeftskonto-Antrag bei Volksbank eG / Die Gestalterbank laeuft.
- Stammkapital muss nach Kontoeroeffnung eingezahlt und dem Notar/Registerprozess nachgewiesen werden.
- AVV/DPA mit relevanten Providern ist weiterhin offen.
- Schreibfehler `brachenuebergreifend` im Gesellschaftsvertrag ist bekannt, aber nicht als HR-Blocker zu behandeln.

Folge fuer Nachbar.io:

- Lokale Vorbereitung ist erlaubt.
- Echte Pilotfreigabe, Live-/Prod-Aenderungen, personenbezogene KI-Verarbeitung und Push bleiben blockiert, bis Founder das separat freigibt.

## Aktueller Git-Stand

Letzter gepruefter Stand:

```text
master...origin/master [ahead 4]
HEAD: c9fce5e Gate remaining AI routes by user setting
origin/master: 10a72f0 Add admin pilot approvals
```

Lokale, noch nicht gepushte Commits:

- `b5c5d66` Add admin AI test user filter
- `5d379c3` Add AI test user cleanup dry run
- `7f2ce38` Gate AI onboarding by user setting
- `c9fce5e` Gate remaining AI routes by user setting

Aktueller Working Tree ist dirty. Vor jeder Arbeit zuerst:

```powershell
git status --short --branch
git diff --stat
```

Nicht ungefragt aufraeumen, nicht stagen, nicht resetten.

## Aktuelle Dirty Files

Geaenderte Dateien:

- `__tests__/api/register-complete-bugfix.test.ts`
- `__tests__/components/admin/UserManagementPilot.test.tsx`
- `app/(app)/admin/components/UserManagement.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- `app/(auth)/register/components/RegisterStepIdentity.tsx`
- `app/(auth)/register/components/index.ts`
- `app/(auth)/register/components/types.ts`
- `app/(auth)/register/page.tsx`
- `lib/services/registration.service.ts`
- `supabase/config.toml` (Line-Endings / nicht aktiv anfassen)

Untracked, fachlich relevant:

- `__tests__/app/register-pilot-role.test.tsx`
- `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- `docs/plans/2026-04-26-codex-handover-pilot-role-admin.md`
- diese Datei: `docs/plans/2026-04-27-codex-handover-frische-session.md`

Untracked / eher Artefakte oder alte Hilfsdateien:

- `.codex-*.log`
- `.playwright-cli/`
- `output/`
- diverse alte `docs/plans/2026-04-2*-handover.md`
- `scripts/disable-supabase-legacy-jwts.sh`
- `scripts/rotate-twilio-oneshot.sh`

Diese Artefakte nicht loeschen, ausser Thomas bittet ausdruecklich darum.

## Was zuletzt gebaut wurde

### Pilot-Rolle im Registrierungsfluss

Neuer Schritt im Register-Flow:

- `app/(auth)/register/components/RegisterStepPilotRole.tsx`

Rollen:

- `resident` - App fuer mich selbst
- `caregiver` - ich unterstuetze jemanden
- `helper` - ich helfe im Quartier
- `test_user` - ich teste nur

Persistenz:

- `users.settings.pilot_role`
- bei `test_user` zusaetzlich:
  - `users.settings.is_test_user = true`
  - `users.settings.test_user_kind = "pilot_onboarding"`
  - `users.settings.must_delete_before_pilot = true`

Keine Migration. `users.role` bleibt technisch weiter `resident`.

### Admin-UI Pilotrollen

`app/(app)/admin/components/UserManagement.tsx` zeigt und filtert Pilotrollen.

Badges:

- `Nutzt selbst`
- `Unterstuetzt`
- `Quartierhilfe`
- `Testnutzer`

Filter:

- alle Rollen
- fuer mich
- Unterstuetzer
- Quartierhilfe
- Testnutzer

Bestehender AI-Testnutzer-Filter bleibt erhalten.

## Bisherige Verifikation laut vorherigem Handoff

Gruen gelaufen:

```powershell
npm test -- __tests__/app/register-pilot-role.test.tsx __tests__/api/register-complete-bugfix.test.ts
npm test -- __tests__/app/register-entry.test.tsx __tests__/app/register-address.test.tsx __tests__/app/register-identity.test.tsx __tests__/app/register-ai-consent.test.tsx __tests__/app/register-pilot-role.test.tsx __tests__/api/register-complete-bugfix.test.ts
npm test -- UserManagementPilot
npm test -- UserManagementPilot register-pilot-role register-complete-bugfix
npx eslint "app/(auth)/register/page.tsx" "app/(auth)/register/components/types.ts" "app/(auth)/register/components/index.ts" "app/(auth)/register/components/RegisterStepIdentity.tsx" "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx" "lib/services/registration.service.ts" "__tests__/app/register-pilot-role.test.tsx" "__tests__/api/register-complete-bugfix.test.ts"
npx eslint "app/(app)/admin/components/UserManagement.tsx" "__tests__/components/admin/UserManagementPilot.test.tsx"
npx tsc --noEmit
```

In frischer Session trotzdem erneut gezielt pruefen, bevor ein Commit empfohlen wird.

## Empfohlener Start in der frischen Session

1. `git status --short --branch`
2. `git diff --stat`
3. Die beiden neuen Pilotrollen-Dateien und betroffenen Register/Admin-Dateien kurz lesen.
4. Gezielt testen:

```powershell
npm test -- UserManagementPilot register-pilot-role register-complete-bugfix
npx tsc --noEmit
```

5. Optional Browser-Smoke lokal, aber nur ohne Prod-Schreibvorgaenge.
6. Wenn alles gruen und Thomas zustimmt: lokalen Commit fuer Pilot-Rollen-Block vorbereiten. Kein Push.

## Naechste fachliche Coding-Schritte

Prioritaet:

1. Pilot-Rollen-WIP sauber verifizieren und lokal committen.
2. Danach erst weitere UI-Feinschliffe am Register-/Admin-Flow.
3. AI-Testnutzer-Cleanup bleibt nur Dry-Run. Execute nur mit ausdruecklichem Founder-Go.
4. Vor echtem Pilot: Cleanup-Dry-Run fuer AI-Testnutzer + Inhalte, dann separate Loeschfreigabe.

## Pre-Check Pflicht

Vor jedem neuen Code:

- codebase-weit suchen
- bestehende Infrastruktur adaptieren
- Plantexte sind nicht autoritativ, Code ist autoritativ
- bei Treffern STOP und Tabelle liefern: Plan fordert X / existiert in Datei:Zeile / Adapter oder Neubau

Wenn `rg` unter Windows blockiert ist:

- `git grep`
- `git ls-files`
- PowerShell `Select-String`

## Offene Risiken

- Working Tree dirty: keine fremden Aenderungen ueberschreiben.
- `master` ist 4 Commits ahead; Push bleibt Founder-Go-pflichtig.
- HR-Eintragung und AVV/DPA offen.
- KI-Funktionen fuer personenbezogene Inhalte bleiben aus.
- Prod-Supabase enthaelt laut Memory nur Founder-/KI-Testdaten, aber trotzdem keine neuen echten Daten in Prod schreiben.
- LocalStack hat Mig-019-Drift; `npm run dev:cloud` ist fuer Cloud-Modus bekannt, aber jede Schreibaktion ist Stop-Zone.
