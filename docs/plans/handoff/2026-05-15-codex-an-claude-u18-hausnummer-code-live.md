# Handoff: Codex an Claude - U18 Hausnummer-Code live

Datum: 2026-05-15
Autor: Codex
Ziel: Claude/Opus soll ohne Rekonstruktion verstehen, was am 2026-05-14/15 an der Pilot-Registrierung geaendert, gepusht und deployed wurde.

## Bitte zuerst lesen

- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\AGENTS.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\CLAUDE.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-14-codex-new-session-handover-family-setup-deployed.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\2026-05-14-codex-an-claude-family-setup-deploy-review.md`
- `C:\Users\thoma\Claud Code\Handy APP\nachbar-io\docs\plans\handoff\INBOX.md`

## Kurzstatus

Nachbar.io `master` ist sauber, gepusht und deployed.

- Production: `https://nachbar-io.vercel.app`
- Live-Commit: `293f177792c621679843759e46b3eafc68cbc1f1`
- Production-Deploy-Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25883663907`
- E2E-Run nach Rerun: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25883640256`
- CodeQL-Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25883640260`

Arbeitsbaum beim Abschluss:

```text
## master...origin/master
```

## Was entschieden wurde

Thomas fragte, ob es fuer den Pilot einfacher geht, alle Bewohner ueber 18 und Jugendliche im Quartier hineinzubekommen.

Entscheidung:

- Kein komplexes Inventar mit mehreren Einmalcodes pro Hausnummer.
- Weiterhin ein bestehender `households.invite_code` pro Hausnummer/Haushalt als Hausnummer-Code.
- Kein Aushang-Code fuer den Pilot.
- Jugendliche 14-17 duerfen mit Hausnummer-Code sofort rein, aber nur eingeschraenkt im Jugendmodus.
- Unter 14 bleibt blockiert und braucht Eltern-/Betreuerzugang.
- Elternbestaetigung ist fuer den Basis-Jugendzugang nicht vorgeschaltet; der Zugang bleibt dafuer eng begrenzt.

## Was gebaut wurde

### Registrierung

Datei: `lib/services/registration.service.ts`

- U18 wird nicht mehr pauschal geblockt.
- `MIN_YOUTH_SELF_REGISTRATION_AGE = 14`.
- 14-17 wird als Jugendlicher erkannt (`isYouth: true`).
- Jugendliche brauchen fuer Self-Registration zwingend:
  - `verificationMethod === "invite_code"`
  - `householdId`
- Manuelle Adressregistrierung fuer Jugendliche ist blockiert.
- Unter 14 erhaelt eine klare 403-Meldung zum Jugendmodus ab 14.
- Jugendliche bekommen `ui_mode = "youth"`.
- `users.settings` speichert Basis-Restriktionen:
  - `youth_registration_status: "basis_without_guardian"`
  - `youth_guardian_confirmation: "not_required_for_basis"`
  - `youth_restrictions`: `basis_access_only`, `no_payments`, `no_sensitive_care_data`, `no_exact_private_addresses`
- `youth_profiles` wird fuer 14-17 angelegt/upserted mit:
  - `access_level: "basis"`
  - `age_group: "u16"` oder `"16_17"`
  - `quarter_id`
  - deterministischem `phone_hash` auf Basis der User-ID

### Invite-Code-Check

Datei: `lib/services/registration.service.ts`

- `checkInviteCode` liefert nun `quarterId` mit.
- Household-Codes lesen `households.quarter_id`.
- Neighbor-Invitations selektieren `quarter_id`.
- Damit kann die UI nach einem Briefcode den Quarter-Kontext an `/api/register/complete` weitergeben.

### UI-Texte

Dateien:

- `app/(auth)/register/components/RegisterStepEntry.tsx`
- `app/(auth)/register/components/RegisterStepInvite.tsx`
- `app/(auth)/register/components/RegisterStepIdentity.tsx`

Geaendert:

- Einstieg spricht von "Hausnummer-Code aus Ihrem Brief" oder persoenlicher Einladung.
- "Aushang" wurde aus dem Registrierungs-Einstieg entfernt.
- Invite-Step sagt: Code steht auf dem Brief und soll nicht oeffentlich geteilt werden.
- Identity-Step sagt: Jugendliche ab 14 koennen mit Hausnummer-Code eingeschraenkt im Jugendmodus starten; unter 14 braucht es Eltern-/Betreuerzugang.
- Nach Invite-Code-Check wird `geoQuarter` aus `quarterId` gesetzt, damit `quarterId` beim Complete-POST vorhanden ist.

### Tests

Geaendert/ergaenzt:

- `__tests__/api/register-complete-bugfix.test.ts`
- `__tests__/lib/registration-service-ai-level.test.ts`
- `__tests__/app/register-entry.test.tsx`
- `__tests__/app/register-identity.test.tsx`
- `tests/e2e/scenarios/s1-onboarding.spec.ts`

Wichtige Tests:

- 16-Jaehriger mit Hausnummer-Code wird angelegt:
  - Auth-User erstellt
  - Profil `ui_mode: "youth"`
  - Haushaltmitglied verifiziert
  - `youth_profiles.upsert` mit `access_level: "basis"`
  - Settings enthalten Jugend-Restriktionen
- Unter 14 bleibt 403 und erzeugt keinen Auth-User.
- Registrierungs-Entry zeigt Brief/Hausnummer-Code und nicht mehr Aushang.
- E2E S1.3 erwartet den neuen Brief-Text und prueft, dass Aushang fehlt.

## Was bewusst entfernt wurde

Die zunaechst gebaute komplexe Code-Inventar-Variante wurde bewusst zurueckgenommen.

Entfernte Artefakte:

- `docs/superpowers/plans/2026-05-14-pilot-family-code-operationalisierung.md`
- `supabase/migrations/198_pilot_household_access_codes.sql`
- `supabase/rollbacks/198_pilot_household_access_codes.down.sql`
- `lib/pilot/pilot-household-codes.ts`
- `__tests__/lib/pilot/pilot-household-codes-migration.test.ts`
- `__tests__/lib/pilot/pilot-household-codes.test.ts`

Grund:

- Fuer Pilot 0 ist ein Hausnummer-Code pro Haushalt einfacher, erklaerbarer und operativ robuster.
- Keine Ersatzcode-/Mehrfachcode-Logik jetzt.
- Keine Migration 198 im finalen Tree.

## Relevante Commits

Aktueller Verlauf:

```text
293f177 test: update registration identity youth copy
3fefecb test: update onboarding copy expectation
604ba42 docs: complete restricted youth signup handoff
fa09c46 feat(registration): allow restricted youth pilot signup
5a9e96a chore(pilot): drop complex household code inventory
aefdae3 feat(pilot): add household code planning service
ec88539 feat(pilot): add household access code schema
ffa0922 docs: claim pilot family code operationalization
5b7ae16 docs: plan pilot family code operationalization
```

Wichtig fuer Reviews: Die komplexen Commits `ec88539`/`aefdae3` sind historisch noch in Git, aber die Dateien wurden in `5a9e96a` aus dem finalen Tree entfernt. Bewertet werden soll der finale Tree auf `293f177`.

## Verifikation

Vor dem ersten Push:

```text
npx vitest run __tests__/api/register-complete-bugfix.test.ts __tests__/lib/registration-service-ai-level.test.ts __tests__/api/pilot-households.test.ts __tests__/app/register-entry.test.tsx
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

Ergebnis:

- gezielte Vitest-Suite: 47/47 gruen.
- TypeScript: gruen.
- Lint: gruen.
- Build: gruen.

Nach CI-Fehlern durch alte Testtexte:

```text
npx vitest run __tests__/app/register-entry.test.tsx
npx playwright test tests/e2e/scenarios/s1-onboarding.spec.ts --config=tests/e2e/playwright.config.ts --project=multi-agent -g "S1.3" --reporter=list
npx vitest run __tests__/app/register-identity.test.tsx
npm run test
```

Ergebnis:

- Register-Entry: gruen.
- Playwright S1.3: gruen.
- Register-Identity: gruen.
- Voller Vitest: 653 Testdateien, 4732 Tests passed, 1 skipped.

GitHub:

- Production Deploy `25883663907`: success.
- CodeQL `25883640260`: success.
- E2E `25883640256`: success nach Rerun.
- Der erste E2E-Run fuer `293f177` scheiterte nicht am Code, sondern beim Docker-Pull mit `toomanyrequests: Rate exceeded` fuer `public.ecr.aws/supabase/logflare:1.34.7`; Rerun war gruen.

Live-Smoke nach Deploy:

```text
https://nachbar-io.vercel.app/register
STATUS 200
HAS_HAUSNUMMER True
HAS_AUSHANG False
```

## Grenzen / Nicht gemacht

- Kein Prod-DB-Write.
- Kein Migration-Apply.
- Keine neue Migration.
- Kein Zahlungssystem.
- Kein Job-Marktplatz.
- Keine Wallets, Coins, Guthaben, IBAN, Payment-Links oder Auszahlungen.
- Keine Ersatzcode-Verwaltung.
- Kein Admin-Dashboard fuer Haushaltscode-Statistik in dieser Welle.
- Kein Elternfreigabe-Workflow fuer den Basis-Jugendzugang vorgeschaltet.

## Bitte Claude jetzt pruefen

Claude soll bitte nicht erneut Code-Inventar oder Ersatzcodes planen, solange Thomas das nicht explizit wieder will. Der aktuelle Pilot-Vorschlag ist absichtlich simpel:

- Erwachsene: Hausnummer-Code aus Brief oder persoenliche Einladung.
- Jugendliche 14-17: Hausnummer-Code aus Brief, sofort eingeschraenkt im Jugendmodus.
- Unter 14: kein Self-Service, Eltern-/Betreuerzugang.

Bitte als naechstes fachlich/operativ pruefen:

1. Ist der Live-Flow fuer den Briefversand klar genug?
2. Welche drei manuellen Pilot-Abnahmetests braucht Thomas vor Briefdruck?
3. Welche Minimalfelder braucht ein spaeteres Admin-Dashboard?
4. Welche Brief-/Onboarding-Formulierungen sollen verbindlich sein?
5. Muss "Jugendmodus ohne Elternbestaetigung, aber eingeschraenkt" noch deutlicher erklaert werden?

## Naechste sinnvolle Umsetzung, falls Thomas Go gibt

1. Live-Abnahme mit Testpersonen:
   - Erwachsener mit Hausnummer-Code.
   - Jugendlicher 14-17 mit Hausnummer-Code.
   - Kind unter 14 muss blockiert werden.
2. Brief-/QR-Text finalisieren und als Doku/Printvorlage sichern.
3. Kleines Admin-Dashboard-Scope bauen:
   - Haushalte gesamt.
   - Haushalte mit erster Registrierung.
   - Jugendliche im Jugendmodus.
   - Leere Haushalte.
   - Support-Notizfeld pro Haushalt, falls bereits vorhanden adaptieren, sonst spaeter entscheiden.

## Rote Gates

Auch nach diesem Deploy gilt:

- Prod-DB-Schreiben nur mit explizitem Founder-Go.
- Migration-Apply nur mit explizitem Founder-Go.
- Deploy nur mit explizitem Founder-Go.
- Push nur mit explizitem Founder-Go.
- Keine Billing-/Payment-/Secrets-/Vercel-Env-Aenderungen ohne ausdrueckliches Go.
