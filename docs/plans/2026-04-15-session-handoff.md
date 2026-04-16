# Session Handoff — Pilot-Readiness Bundle

**Datum:** 2026-04-16  
**Repo:** `C:/Users/thoma/Documents/New project/nachbar-io`  
**Branch:** `master`  
**Live-URL:** `https://nachbar-io.vercel.app`  
**Letzter live deployter Commit:** `6f98cb6` (`Polish map mobile help and controls`)  
**Lokal letzter Commit:** `85a66c0` (`Fix leaflet map resident lookup`)  

## Wichtig

- Diese Datei ist die maßgebliche Wahrheit für die nächste Session.
- Seit diesem lokalen Bündel wurde **nichts gepusht und nichts deployed**.
- `master` ist lokal **1 Commit vor `origin/master`**:
  - lokaler `HEAD`: `85a66c0`
  - `origin/master`: `6f98cb6`
- Zusätzlich liegt ein größerer **ungecommiteter lokaler Pilot-Fix-Bundle** im Worktree.
- `.playwright-cli/` und `output/` **nicht committen**.
- Nutzerwunsch für Vercel:
  - keine Mikro-Pushes / keine Mini-Deploys
  - Änderungen lokal bündeln, testen, dann erst als sinnvolles Paket committen/pushen/deployen

## Was lokal bereits fertig ist

### 1. Bereits committed, aber noch nicht gepusht

- `85a66c0` — `Fix leaflet map resident lookup`
  - behebt den kaputten Household-/Resident-Lookup im Leaflet-Hauspanel
  - Root Cause war **nicht** `onboarding_completed`, sondern der Straßen-/Lookup-Bruch im Panel

### 2. Uncommitteter lokaler Pilot-Bundle

#### `/map` Status- und Farbpaket

- zentrale Statussemantik in `lib/map-statuses.ts`
- gemeinsamer Hook in `lib/hooks/useMapStatuses.ts`
- UI-Anpassungen in:
  - `components/MapFilterBar.tsx`
  - `components/LeafletKarte.tsx`
  - `components/LeafletMapInner.tsx`
  - `components/NachbarKarteSvg.tsx`
- Tests:
  - `__tests__/components/MapFilterBar.test.tsx`
  - `lib/__tests__/map-statuses.test.ts`

Aktuelle Logik:

- `SOS` = rot
- `Hilfe` = gelb
- `Urlaub` = blau
- `Paket` = orange
- sonst `Okay` = grün

#### Security-Fix gegen False Positives

- `lib/security/client-key.ts`
- `lib/security/traps/trap-utils.ts`
- Test:
  - `__tests__/lib/security/device-fingerprint.test.ts`

Inhalt:

- stabilerer `deviceHash`
- saubererer `sessionHash`
- behebt lokale/legitime `session_drift`- bzw. `fp_instability`-Fehlalarme

#### `/dashboard` wieder als echter Einstieg

- `lib/legacy-routes.ts`
- `__tests__/middleware/legacy-routes.test.ts`

Inhalt:

- `/dashboard` ist nicht mehr fälschlich legacy-geblockt
- Login-Landepunkt passt wieder zur App-Logik und zu den E2E-Flows

#### `/profile/map-position` Leerzustand korrigiert

- `app/(app)/profile/map-position/page.tsx`
- `lib/map-position.ts`
- Test:
  - `lib/__tests__/map-position.test.ts`

Inhalt:

- falscher Login-/Haushalt-Leerzustand entfernt
- bei fehlender Kartenposition jetzt fachlich korrekter Zustand

#### `/profile` Legacy-Sackgassen deaktiviert

- `app/(app)/profile/page.tsx`
- Test:
  - `__tests__/app/profile-page-bugfix.test.tsx`

Inhalt:

- `KI-Assistent`, `Umfragen` und `Paketannahme` werden im Profil nicht mehr als falsche aktive Ziele gerendert
- aktive Ziele wie `Nachrichten` und `Karte` bleiben klickbar

#### Kiosk-PIN + Kiosk-Login repariert

- `app/(app)/profile/kiosk-pin/page.tsx`
- `app/api/kiosk/login/route.ts`
- `lib/kiosk-pin.ts`
- Tests:
  - `__tests__/api/kiosk-login.test.ts`
  - `lib/__tests__/kiosk-pin.test.ts`

Inhalt:

- PIN liegt jetzt konsistent in `users.settings`
- anonymer Kiosk-PIN-Lookup läuft über Admin/Service-Role statt über normalen Client
- Demo-Bypass `1234` wurde entfernt

#### `/care/caregiver` Response-Shape-Fix

- `modules/care/components/caregiver/CaregiverSettings.tsx`
- Test:
  - `__tests__/components/care/CaregiverSettings.test.tsx`

Inhalt:

- UI akzeptiert jetzt sowohl top-level `as_resident` als auch die alte verschachtelte Antwortform
- falscher Fehlerzustand `Angehörige konnten nicht geladen werden` ist lokal behoben

#### Nachrichten- + Care-Realtime-Fixpaket

- Produktcode:
  - `app/(app)/messages/page.tsx`
  - `app/(app)/messages/[id]/page.tsx`
  - `lib/services/misc-utilities.service.ts`
  - `modules/care/services/permissions.ts`
  - `modules/care/hooks/useCareRole.ts`
- Test-/E2E-Code:
  - `__tests__/app/messages/page.test.tsx`
  - `__tests__/api/resident/resident-status.test.ts`
  - `__tests__/lib/care/permissions.test.ts`
  - `__tests__/hooks/care-supabase-hooks.test.ts`
  - `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts`
  - `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts`
  - `tests/e2e/helpers/db-seeder.ts`
  - `tests/e2e/helpers/test-config.ts`
  - `tests/e2e/helpers/agent-factory.ts`
  - `tests/e2e/auth-setup.ts`
  - `tests/e2e/fixtures/roles.ts`
  - `tests/e2e/playwright.config.ts`

Inhalt:

- `/messages` und `/messages/[id]` warten jetzt korrekt auf Auth-Hydration statt beim ersten Mount leer zu bleiben oder zu früh auf `/login` umzuleiten
- `resident/status` liefert für echte `caregiver_links` jetzt auch den letzten Check-in zurück; der Zugriff wird erst über den normalen User-Client validiert und liest den Check-in dann gezielt per Admin-Client
- Care-Rollenauflösung unterstützt nun zusätzlich `caregiver_links` als Fallback neben `care_helpers`; dadurch ist die Angehörigen-Detailansicht `/care/meine-senioren/[seniorId]` für den E2E-Caregiver erreichbar
- lokales E2E-Seeding legt für `betreuer_t` jetzt konsistent ein `plus`-Trial an
- der lokale E2E-Sicherheits-Bypass wird testweit über den Header `x-nachbar-test-mode: e2e-test-secret-dev` gesetzt
- Navigation-/Load-Timeouts für kalte lokale Webpack-Compiles wurden erhöht

## Aktueller Worktree

### Geändert, aber noch nicht committed

- `__tests__/app/profile-page-bugfix.test.tsx`
- `__tests__/components/MapFilterBar.test.tsx`
- `__tests__/lib/security/device-fingerprint.test.ts`
- `__tests__/middleware/legacy-routes.test.ts`
- `app/(app)/profile/kiosk-pin/page.tsx`
- `app/(app)/profile/map-position/page.tsx`
- `app/(app)/profile/page.tsx`
- `app/api/kiosk/login/route.ts`
- `components/LeafletKarte.tsx`
- `components/LeafletMapInner.tsx`
- `components/MapFilterBar.tsx`
- `components/NachbarKarteSvg.tsx`
- `docs/plans/2026-04-15-session-handoff.md`
- `lib/hooks/useMapStatuses.ts`
- `lib/legacy-routes.ts`
- `lib/security/client-key.ts`
- `lib/security/traps/trap-utils.ts`
- `modules/care/components/caregiver/CaregiverSettings.tsx`
- `modules/care/hooks/useCareRole.ts`
- `modules/care/services/permissions.ts`
- `lib/services/misc-utilities.service.ts`
- `tests/e2e/auth-setup.ts`
- `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts`
- `tests/e2e/fixtures/roles.ts`
- `tests/e2e/helpers/agent-factory.ts`
- `tests/e2e/helpers/db-seeder.ts`
- `tests/e2e/helpers/test-config.ts`
- `tests/e2e/playwright.config.ts`
- `app/(app)/messages/page.tsx`
- `app/(app)/messages/[id]/page.tsx`
- `__tests__/api/resident/resident-status.test.ts`
- `__tests__/hooks/care-supabase-hooks.test.ts`
- `__tests__/lib/care/permissions.test.ts`

### Untracked, aber fachlich Teil des Bundles

- `__tests__/api/kiosk-login.test.ts`
- `__tests__/app/messages/page.test.tsx`
- `__tests__/components/care/CaregiverSettings.test.tsx`
- `lib/__tests__/kiosk-pin.test.ts`
- `lib/__tests__/map-position.test.ts`
- `lib/__tests__/map-statuses.test.ts`
- `lib/kiosk-pin.ts`
- `lib/map-position.ts`
- `lib/map-statuses.ts`
- `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts`

### Untracked, nicht committen

- `.playwright-cli/`
- `output/`

## Verifikation bis jetzt

### Build / Lint / Tests

- `npm run build` lief in den relevanten Fix-Blöcken wiederholt sauber
- `eslint` auf den neu angefassten Dateien war sauber
- gezielte Vitest-Suites waren grün, u. a.:
  - Map + Security: `81 Tests`
  - Dashboard/Profile-Block: `33 Tests`
  - Profil-Regression: `8 Tests`
  - Kiosk-PIN / Kiosk-Login: `7 Tests`
  - CaregiverSettings: `2 Tests`
- zusätzlich zuletzt grün:
  - `npx vitest run __tests__/api/resident/resident-status.test.ts __tests__/lib/care/permissions.test.ts __tests__/hooks/care-supabase-hooks.test.ts`
  - `36 Tests`

### Breitere lokale Browser-Sweeps

Sauber geprüft wurden bereits u. a.:

- `dashboard`
- `profile`
- `profile/edit`
- `profile/skills`
- `profile/reputation`
- `profile/notifications`
- `profile/passkey`
- `profile/location`
- `profile/vacation`
- `profile/map-position`
- `profile/delete`
- `einstellungen/favoriten`
- `notifications`
- `help`
- `help-center`
- `invitations`
- `messages`
- `postfach`
- `mein-kreis`
- Kiosk-/öffentliche Routen
- Care-Hauptrouten

Wichtig:

- `/care/caregiver` war in diesem Sweep noch fehlerhaft und wurde danach lokal repariert
- `/care/reports` leitete auf `/kreis-start` um; das wurde bisher **nicht** als akuter Pilot-Blocker bewertet

### Letzter echter Pilot-Kernlauf am 2026-04-16

Im Browser lokal geprüft, mit E2E-Sicherheits-Bypass und echtem Auth-Flow:

- `Login -> Dashboard`
- `Benachrichtigungen`
- `Nachrichten`
- `Postfach -> Neue Nachricht`
- `SOS`-Sheet öffnen/schließen
- `Hilfe-Börse -> neuen Eintrag anlegen`
- `Map`
- `Profil`
- `Care -> Angehörige`
- `Senior -> Check-in`
- `Heartbeat`

Ergebnis:

- Resident `/map` OK
- Resident `/profile` OK
- Resident `/care/caregiver` OK
- Senior `/care/checkin` OK (`201`)
- Senior `heartbeat` OK (`200`)
- keine Console-/Page-/API-Fehler im finalen fokussierten Re-Run

### Letzte echte Mehrnutzer-/Cross-Portal-Verifikation am 2026-04-16

Lokal erfolgreich durchgelaufen:

- `npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent s12-neighbor-request-chat.spec.ts`
- `E2E_LIVE=1 npx playwright test --config=tests/e2e/playwright.config.ts --project=cross-portal tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts`
- `E2E_LIVE=1 npx playwright test --config=tests/e2e/playwright.config.ts --project=cross-portal tests/e2e/cross-portal/x19-postfach-thread.spec.ts`

Ergebnis:

- `S12` grün:
  - Nachbar-Anfrage senden
  - in `/messages` sichtbar
  - annehmen
  - echter Chat in beide Richtungen
- `X01` grün:
  - Senior sendet echten Check-in `ok/good`
  - Check-in ist resident-seitig in der Historie sichtbar
  - Caregiver sieht den aktualisierten Status in `/care/meine-senioren/[seniorId]`
  - `need_help` ist ebenfalls lokal verifiziert
  - aktive SOS-/Eskalationssicht erscheint in der Care-Detailansicht des Angehörigen
- `X19` grün:
  - Bürger sendet echte Nachricht über `/postfach/neu`
  - Thread landet korrekt im `civic_messages`-Modell
  - Rathaus-Antwort wurde für dieses Repo lokal über das Civic-Datenmodell simuliert, weil die echte Staff-/Civic-HTTP-Oberfläche in einem separaten Repo lebt
  - Bürger sieht die neue Antwort in `/postfach`, öffnet den Thread und markiert ihn als gelesen
  - Bürger antwortet im echten Thread erneut; Reply-Count/Awaiting-Reply werden im Modell korrekt abgeleitet

Wichtig:

- Der frühere `resident/status`-Bug war kein Testartefakt, sondern ein echter Produktfehler zwischen `caregiver_links`-Zugriff und `care_checkins`-Lesepfad
- Das Dashboard ist für diesen Flow aktuell **nicht** die richtige UI-Zielfläche; der verifizierte Caregiver-Pfad ist die Senior-Detailseite unter `/care/meine-senioren/[seniorId]`
- Für stabile lokale Cross-Portal-Läufe gegen `next dev` war `E2E_LIVE=1` wichtig:
  - kein zusätzlicher Playwright-Webserver
  - serielle Worker-Ausführung
  - deutlich weniger Auth-/Compile-Races
- Der `x19`-Spec wurde lokal so angepasst, dass er in `nachbar-io` repo-korrekt bleibt:
  - Bürgerpfad bleibt echter UI/API-Flow
  - Civic-Seite wird über das kanonische Datenmodell geprüft, nicht über nicht vorhandene lokale Staff-Routen

Zusatz:

- temporäre `[E2E] Pilot Smoke ...`-Hilfeeinträge wurden wieder gelöscht
- der lokale Dev-Server wurde wieder beendet

## Wichtige technische Hinweise für die nächste Session

- Für stabile lokale Browserprüfungen den Security-Bypass nutzen:
  - Header: `x-nachbar-test-mode: e2e-test-secret-dev`
  - `.env.local` enthält:
    - `E2E_TEST_SECRET="e2e-test-secret-dev"`
    - `SECURITY_E2E_BYPASS="e2e-test-secret-dev"`
- Für lokale Logins hat sich bewährt:
  - zuerst `/login` öffnen
  - dann LocalStorage setzen:
    - `care_disclaimer_accepted=true`
    - `e2e_disable_alarm=true`
    - `e2e_skip_onboarding=true`
  - danach `POST /api/test/login` oder Redirect-Login über `/api/test/login?...`
- `/profile` rendert kurz `Laden...`; also bei Browserchecks nicht zu früh auf Header-Text asserten
- `/map` ist lokal fachlich OK; frühere Probleme dort waren zuletzt Verifikations-/Timingartefakte, kein reproduzierter Produktfehler
- Für lokale Playwright-Läufe gegen den bereits gestarteten Dev-Server bevorzugt:
  - `E2E_LIVE=1`
  - dadurch nur `1` Worker und keine zusätzliche Webserver-Orchestrierung im Test-Runner

## Nächster sinnvoller Block

Die offenen Mehrnutzer-/Realtime-Flows sind jetzt lokal abgedeckt. Der nächste sinnvolle Block ist daher:

1. Commit-Grenze festziehen und das lokale Bündel in einem sauberen Paket committen
2. Karten-/Adresslogik auf amtliche BW-Hauskoordinaten ausrichten
3. Fallback-Geocoder nur mit Accuracy-Filter und Pin-Bestaetigung einsetzen
4. `profile/map-position` von manueller SVG-Pflege zu "amtlich zuerst, manuell nur bei Bedarf" weiterentwickeln

## Relevante Dateien

- `docs/plans/2026-04-15-session-handoff.md`
- `lib/security/client-key.ts`
- `lib/security/traps/trap-utils.ts`
- `lib/legacy-routes.ts`
- `lib/map-statuses.ts`
- `lib/hooks/useMapStatuses.ts`
- `lib/map-position.ts`
- `lib/kiosk-pin.ts`
- `app/(app)/profile/page.tsx`
- `app/(app)/profile/map-position/page.tsx`
- `app/(app)/profile/kiosk-pin/page.tsx`
- `app/api/kiosk/login/route.ts`
- `components/MapFilterBar.tsx`
- `components/LeafletKarte.tsx`
- `components/LeafletMapInner.tsx`
- `components/NachbarKarteSvg.tsx`
- `modules/care/components/caregiver/CaregiverSettings.tsx`
- `modules/care/hooks/useCareRole.ts`
- `modules/care/services/permissions.ts`
- `lib/services/misc-utilities.service.ts`
- `app/(app)/messages/page.tsx`
- `app/(app)/messages/[id]/page.tsx`
- `tests/e2e/scenarios/s12-neighbor-request-chat.spec.ts`
- `tests/e2e/cross-portal/x01-checkin-heartbeat.spec.ts`
- `tests/e2e/cross-portal/x19-postfach-thread.spec.ts`
- `tests/e2e/helpers/db-seeder.ts`
- `docs/plans/2026-04-16-bw-house-coordinates-map-strategy.md`

## Exakter Startsatz für die nächste Session

Arbeite in `nachbar-io` auf `master` weiter und nutze `docs/plans/2026-04-15-session-handoff.md` als maßgebliche Wahrheit. Live steht weiter auf `6f98cb6`, lokal steht `HEAD` auf `85a66c0` und `master` ist damit 1 Commit vor `origin/master`; zusätzlich liegt ein ungecommiteter lokaler Pilot-Fix-Bundle im Worktree. Seit diesem Bundle wurde nichts gepusht oder deployed. Committe `.playwright-cli/` und `output/` nicht. `S12`, `X01` und `X19` sind lokal grün; `X01` deckt jetzt auch `need_help`/SOS in der Care-Detailansicht ab. Für stabile lokale Cross-Portal-Läufe gegen den gestarteten Dev-Server nutze `E2E_LIVE=1`. Der nächste sinnvolle Block ist jetzt nicht weiterer Seitensmoke, sondern Commit-Bündelung plus Umsetzung der Karten-/Adressstrategie aus `docs/plans/2026-04-16-bw-house-coordinates-map-strategy.md`.
