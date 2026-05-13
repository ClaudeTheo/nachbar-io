# Codex New-Session-Handover - Generationen-Modi implementiert, Push gestoppt

Datum: 2026-05-13
Von: Codex
An: Neue Codex/Claude-Session
Status: lokal fertig, nicht gepusht

## TL;DR

Visual-Polish bleibt unveraendert und vom Founder als perfekt bestaetigt. Generationen-Modi wurden lokal in G1-G5 adapterartig umgesetzt: Registry, Login-Dispatch, Admin-Create-Validierung, file-first Migration 195, Onboarding-Modusauswahl, Profil-/Admin-Umschalter und Komfort-Dashboard-Density. Es wurde nicht gepusht, weil der neue Code `youth/comfort` in `users.ui_mode` schreiben kann, Prod aber die Constraint aus Migration 195 noch nicht angewendet hat. Das triggert den Auto-Stop: kein Deploy von Code, der eine nicht angewendete Prod-Migration voraussetzt.

## Repo-Stand beim Schreiben

- Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Stand vor diesem Handoff-Commit: `master...origin/master [ahead 8]`
- Arbeitsbaum vor diesem Handoff-Commit: sauber
- Kein Push, kein Deploy, kein Prod-DB-Write, kein Migration-Apply

## Lokale Commits seit origin/master

```text
8347bb3 feat(ui): wire generation mode adapters
050666e docs(handoff): start generation modes UI adapters
fe1c29a feat(admin): prepare generation ui modes
be47adb docs(handoff): start generation modes data prep
b8387bc feat(auth): add generation mode registry
4f7b09d docs(handoff): start generation modes registry
6cf53ce docs(handoff): new session generation modes
6c7b6be docs(product): plan generation modes
```

Nach dem Commit dieser Handoff-Datei ist `ahead` entsprechend hoeher.

## Was umgesetzt wurde

### G1 - Mode-Registry + Login-Dispatch

- Neue Registry: `lib/user-modes.ts`
- `UserUiMode` erweitert auf `youth | active | comfort | senior`
- `resolvePostLoginPath` nutzt die Registry:
  - `youth -> /jugend`
  - `active -> /dashboard`
  - `comfort -> /dashboard`
  - `senior -> /kreis-start`
- Tests:
  - `__tests__/lib/user-modes.test.ts`
  - `__tests__/lib/auth/post-login-redirect.test.ts`

### G2 - DB-Constraint file-first + Admin-Create Adapter

- Pre-Check fand bestehende Constraint in `supabase/migrations/001_initial_schema.sql`:
  `CHECK (ui_mode IN ('active', 'senior'))`
- Neue Migration file-first:
  - `supabase/migrations/195_generation_ui_modes.sql`
  - `supabase/rollbacks/195_generation_ui_modes.down.sql`
- Wichtig: Migration 195 wurde nicht angewendet, weder lokal noch Prod.
- `modules/admin/services/create-user.service.ts` validiert `uiMode` gegen die Registry.
- Tests:
  - `__tests__/lib/generation-ui-modes-migration.test.ts`
  - `__tests__/modules/admin/admin-audit-log.test.ts`

### G3 - Onboarding-Modusauswahl

- `modules/onboarding/components/OnboardingFlow.tsx`
- Neue fruehe Modusauswahl:
  - Junges Quartier
  - Aktiv
  - Komfort
  - Einfach
- `completeOnboarding({ uiMode })` speichert den Modus zusammen mit `onboarding_completed`.
- Weiterleitung nach Onboarding laeuft ueber Registry-`postLoginPath`.
- Test:
  - `__tests__/modules/onboarding/onboarding.service.test.ts`

### G4 - Admin- und Profil-Umschalter

- Admin:
  - `app/(app)/admin/components/UserManagement.tsx`
  - vier Modi statt Normal/Senior
  - Create-User-Form und Nutzer-Detail-Umschalter nutzen Registry
- Profil:
  - `app/(app)/profile/page.tsx`
  - vier Modus-Buttons im Abschnitt "Oberflaeche"
  - `setUiMode` neu in `lib/services/profile.service.ts`
  - Barrel-Export in `lib/services/index.ts`
- Tests:
  - `__tests__/components/admin/UserManagementPilot.test.tsx`
  - `__tests__/app/profile-page-bugfix.test.tsx`
  - `lib/services/__tests__/profile.service.test.ts`

### G5 - Komfort-Dashboard minimal

- `app/(app)/dashboard/hooks/useDashboardData.ts`
  - liest `ui_mode`
  - leitet `dashboardDensity` aus Registry ab
- `app/(app)/dashboard/page.tsx`
  - `data-dashboard-density`
  - Komfortmodus (`calm`) bekommt nur mehr Abstand und groessere Schnellzugriffs-Kacheln
- Kein Visual-Experiment, keine neue Dashboard-Architektur.

### G6 - Jugend-Start

Pre-Check ergab: `/jugend` existiert bereits als App-Route unter `app/(app)/jugend/page.tsx` und nutzt `modules/youth` (`useYouthProfile`, `PointsDisplay`, `AccessLevelBanner`). Daher kein Neubau. Login-Dispatch kann bereits nach `/jugend` leiten.

## Verifikation

Gruen:

```powershell
npx vitest run __tests__/lib/auth/post-login-redirect.test.ts __tests__/lib/user-modes.test.ts __tests__/modules/admin/admin-audit-log.test.ts __tests__/lib/generation-ui-modes-migration.test.ts
# 17/17 passed

npx vitest run lib/services/__tests__/profile.service.test.ts __tests__/modules/onboarding/onboarding.service.test.ts __tests__/components/admin/UserManagementPilot.test.tsx __tests__/app/profile-page-bugfix.test.tsx
# 24/24 passed

npx eslint 'modules/onboarding/services/onboarding.ts' 'modules/onboarding/components/OnboardingFlow.tsx' 'lib/services/profile.service.ts' 'lib/services/index.ts' 'app/(app)/admin/components/UserManagement.tsx' 'app/(app)/profile/page.tsx' 'app/(app)/dashboard/hooks/useDashboardData.ts' 'app/(app)/dashboard/page.tsx' 'lib/services/__tests__/profile.service.test.ts' '__tests__/modules/onboarding/onboarding.service.test.ts' '__tests__/components/admin/UserManagementPilot.test.tsx' '__tests__/app/profile-page-bugfix.test.tsx'

npx tsc --noEmit

git diff --check

npm run build
```

Build war gruen. Hinweise im Build:

- `STRIPE_SECRET_KEY nicht konfiguriert - Zahlungen deaktiviert` mehrfach, erwartbar im lokalen Kontext.

Browser-Smoke:

```powershell
npm run start -- -p 3002
Invoke-WebRequest http://127.0.0.1:3002/profile
npx playwright screenshot --channel msedge http://127.0.0.1:3002/welcome output/playwright/generation-modes-welcome.png --timeout=30000
```

- `/profile` HTTP 200
- Screenshot erfolgreich erstellt
- Lokaler Server-Prozess wurde danach gestoppt

Hinweis: `/welcome` redirectete im Smoke wegen aktuellem Auth-/Closed-Pilot-Zustand sichtbar auf die geschlossene Pilot-Landing, nicht auf den Onboarding-Screen. Das ist fuer den Routing-Smoke okay, aber kein vollstaendiger interaktiver Onboarding-Flow-Test.

## Stop-Grund: kein Push

Nicht gepusht, obwohl Founder sagte "mach alle autonom".

Grund: Auto-Stop aus `AGENTS.md`:

> "The code to push/deploy assumes migrations that are not applied on Prod."

Der neue Code erlaubt und speichert `youth`/`comfort` in `users.ui_mode`. Prod hat sehr wahrscheinlich noch die alte Constraint `active/senior`. Ohne Migration 195 wuerden Schreibpfade fuer neue Modi in Prod brechen. Migration 195 ist vorbereitet, aber Prod-Apply bleibt rote Zone.

## Sichere naechste Wege

### Option A - Migration anwenden, dann pushen

Nur wenn Founder explizit gibt:

```text
MIGRATION-PROD-GO-195
```

Dann:

1. Prod-Preflight read-only: aktuelle Constraint pruefen.
2. Migration 195 auf Prod anwenden.
3. Read-only verifizieren: Constraint erlaubt `youth/active/comfort/senior`.
4. `git push origin master`.
5. Deploy/CI beobachten.

### Option B - Ohne Prod-Migration pushbar machen

Wenn keine Prod-Migration gewuenscht ist:

1. Runtime-Gate einfuehren, z.B. Feature-Flag/Env/Settings: `youth`/`comfort` werden angezeigt, aber bis DB-Freigabe nicht geschrieben.
2. Tests anpassen: Schreibpfade bleiben auf `active/senior`, solange Gate off.
3. Dann pushen ohne Migration-Apply.

## Rote Zone bleibt

- Kein Prod-DB-Write / Migration-Apply ohne ausdrueckliches Founder-Go.
- Keine Vercel-Env-/Secrets-/Billing-/Provider-Live-Aktion.
- Keine neuen laufenden Kosten.
- Keine Visual-Polish-Experimente.
- Jugendliche duerfen keine sensiblen Senior-/Care-Daten sehen.

## Startprompt fuer neue Session

```text
Bitte in C:\Users\thoma\Claud Code\Handy APP\nachbar-io starten.

Zuerst lesen:
- AGENTS.md
- docs/plans/handoff/2026-05-13-claude-an-codex-visual-polish-tag2-uebergabe.md
- docs/plans/2026-05-13-generationen-modi-plan.md
- docs/plans/handoff/2026-05-13-codex-new-session-handover-generation-modes-implemented.md

Dann pruefen:
- git status --short --branch
- git log --oneline -12

Wichtig:
- Visual-Polish ist perfekt bestaetigt, keine Design-Experimente.
- Lokal sind Generationen-Modi G1-G5 committed, aber nicht gepusht.
- Migration 195 ist file-first vorbereitet, aber NICHT applied.
- Kein Push nach master, solange Code youth/comfort schreiben kann und Prod-Migration 195 nicht angewendet oder per Runtime-Gate entschaerft ist.
- Kein Prod-DB-Write/Migration-Apply/Vercel-Env/Secrets/Billing/Provider-Live ohne Founder-Go.

Naechster sicherer Schritt:
- Entweder Founder-Go fuer `MIGRATION-PROD-GO-195` einholen und dann Mig 195 anwenden + pushen.
- Oder Runtime-Gate bauen, damit youth/comfort noch nicht in Prod geschrieben werden, dann pushen.
```
