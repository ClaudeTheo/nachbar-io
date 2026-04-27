# Übergabe an nächste Codex-Session - Nachbar.io Pilot-Rolle

Stand: 2026-04-26 abends

Arbeitsverzeichnis:

`C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Rote Linien

- Kein Push gemacht.
- Kein Deploy gemacht.
- Kein Prod-DB-Zugriff.
- Keine Secrets gelesen.
- Keine Billing-/Cleanup-Execute-Aktionen.
- Alte Dirty Files bewusst nicht angefasst.

## Ausgangslage

Founder-Entscheidung:

Beim Pilot-Onboarding soll festgestellt werden, welche Rolle eine Person im Pilot hat. Der Senior-/Dashboard-Gedanke bleibt Produktidee fuer die Hauptapp / spaetere Pro-Version. Die alte Pi-/Kiosk-Insel ist davon getrennt zu betrachten.

## Umgesetzt

### 1. Pilot-Rollenfrage im Registrierungsfluss

Dateien:

- `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- `app/(auth)/register/components/types.ts`
- `app/(auth)/register/components/index.ts`
- `app/(auth)/register/components/RegisterStepIdentity.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- `app/(auth)/register/page.tsx`
- `lib/services/registration.service.ts`
- `__tests__/app/register-pilot-role.test.tsx`
- `__tests__/api/register-complete-bugfix.test.ts`

Ergebnis:

Registrierung fragt nach der Pilotrolle:

- `resident` - Ich nutze die App fuer mich
- `caregiver` - Ich unterstuetze jemanden
- `helper` - Ich helfe im Quartier
- `test_user` - Ich teste nur

Speicherung:

- `users.settings.pilot_role`
- bei `test_user` zusaetzlich:
  - `users.settings.is_test_user = true`
  - `users.settings.test_user_kind = "pilot_onboarding"`
  - `users.settings.must_delete_before_pilot = true`

Keine Migration. `users.role` bleibt vorerst unveraendert `resident`.

### 2. Admin-Nutzerverwaltung zeigt und filtert Pilot-Rollen

Dateien:

- `app/(app)/admin/components/UserManagement.tsx`
- `__tests__/components/admin/UserManagementPilot.test.tsx`

Ergebnis:

Admin-Nutzerverwaltung zeigt Pilotrollen als Badge:

- `Nutzt selbst`
- `Unterstuetzt`
- `Quartierhilfe`
- `Testnutzer`

Filter:

- Alle Rollen
- Fuer mich
- Unterstuetzer
- Quartierhilfe
- Testnutzer

Bestehender AI-Testnutzer-Filter bleibt erhalten.

### 3. Firmen-Gedaechtnis dokumentiert

Dateien:

- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\03_Entscheidungen\Entscheidungslog.md`
- `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\02_Projekte\Nachbar-io.md`

Ergebnis:

Entscheidung "Nachbar.io Pilot-Onboarding fragt Nutzerrolle ab" dokumentiert.

## Verifikation

Ausgefuehrt und gruen:

```powershell
npm test -- __tests__/app/register-pilot-role.test.tsx __tests__/api/register-complete-bugfix.test.ts
npm test -- __tests__/app/register-entry.test.tsx __tests__/app/register-address.test.tsx __tests__/app/register-identity.test.tsx __tests__/app/register-ai-consent.test.tsx __tests__/app/register-pilot-role.test.tsx __tests__/api/register-complete-bugfix.test.ts
npm test -- UserManagementPilot
npm test -- UserManagementPilot register-pilot-role register-complete-bugfix
npx eslint "app/(auth)/register/page.tsx" "app/(auth)/register/components/types.ts" "app/(auth)/register/components/index.ts" "app/(auth)/register/components/RegisterStepIdentity.tsx" "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx" "lib/services/registration.service.ts" "__tests__/app/register-pilot-role.test.tsx" "__tests__/api/register-complete-bugfix.test.ts"
npx eslint "app/(app)/admin/components/UserManagement.tsx" "__tests__/components/admin/UserManagementPilot.test.tsx"
npx tsc --noEmit
```

## Aktueller Git-Hinweis

Vor dieser Session war `master...origin/master [ahead 4]`.

Neu geaenderte/angelegte Dateien aus dieser Session:

- `__tests__/api/register-complete-bugfix.test.ts`
- `__tests__/app/register-pilot-role.test.tsx`
- `__tests__/components/admin/UserManagementPilot.test.tsx`
- `app/(app)/admin/components/UserManagement.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- `app/(auth)/register/components/RegisterStepIdentity.tsx`
- `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- `app/(auth)/register/components/index.ts`
- `app/(auth)/register/components/types.ts`
- `app/(auth)/register/page.tsx`
- `lib/services/registration.service.ts`
- `docs/plans/2026-04-26-codex-handover-pilot-role-admin.md`

Alte Dirty Files aus vorherigen Sessions weiterhin vorhanden und nicht angefasst, u.a.:

- `supabase/config.toml`
- `.codex-*.log`
- `.playwright-cli/`
- `output/`
- diverse alte `docs/plans/*handover.md`
- `scripts/disable-supabase-legacy-jwts.sh`
- `scripts/rotate-twilio-oneshot.sh`

## Naechste sinnvolle Schritte

1. In naechster Session zuerst `git status --short --branch` pruefen.
2. Optional Browser-Smoke fuer Registrierung und Admin-Nutzerverwaltung.
3. Danach entscheiden:
   - lokale Commit-Erstellung fuer Pilot-Rollen-Block, oder
   - erst weitere UI-Feinschliffe / Kiosk-Aufraeumentscheidung.

Weiterhin gilt:

Kein Push, kein Deploy, keine Prod-DB, keine Secrets, kein Billing ohne ausdruecklichen Founder-Go.
