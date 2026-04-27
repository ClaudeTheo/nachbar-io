# Codex-Uebergabe fuer naechste Session - Pilot-Onboarding + Kiosk geparkt

Stand: 2026-04-27, nach lokaler Codex-Session

Arbeitsverzeichnis:

`C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Wichtigste Orientierung

Dies ist die echte Nachbar.io-Codebase.

Nicht verwechseln mit:

`C:\Users\thoma\Documents\New project\nachbar-io`

Vor Weiterarbeit lesen:

1. `C:\Users\thoma\Documents\New project\AGENTS.md`
2. `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\00_Start-hier.md`
3. `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\02_Projekte\Nachbar-io.md`
4. `C:\Users\thoma\Documents\New project\firmen-gedaechtnis\01_Firma\GmbH-und-Recht.md`
5. `C:\Users\thoma\Claud Code\Handy APP\CLAUDE.md`
6. `C:\Users\thoma\.claude\projects\C--Users-thoma-Claud-Code-Handy-APP\memory\MEMORY.md`
7. diese Datei

## Rote Linien

- Kein `git push origin master`.
- Kein Deploy.
- Keine Prod-DB-Schreibvorgaenge.
- Keine Cloud-Migrationen.
- Keine Secrets lesen oder ausgeben.
- Kein Billing.
- Keine echten Pilotnutzer freischalten.
- Keine KI-Verarbeitung personenbezogener Inhalte ohne AVV/DPA-/Founder-Go.

## Aktueller Git-Stand vor dieser Uebergabe

Vor dem Handover-Doku-Commit war:

```text
master...origin/master [ahead 11]
HEAD: f3fb950 Elevate pilot onboarding story
origin/master: 10a72f0 Add admin pilot approvals
```

Neuere lokale Commits seit `origin/master`:

```text
f3fb950 Elevate pilot onboarding story
ec1cab0 Show pilot cleanup markers in admin
fc3114e Polish pilot role selection flow
6db1a4f Mark kiosk web routes as parked
a22045c Document kiosk route group deprecation precheck
f08381b chore(cleanup): remove raspberry-pi/ folder (Pi 5 retired)
7a19c7a Add pilot role onboarding
c9fce5e Gate remaining AI routes by user setting
7f2ce38 Gate AI onboarding by user setting
5d379c3 Add AI test user cleanup dry run
b5c5d66 Add admin AI test user filter
```

Wenn diese Datei committed wurde, ist der Branch danach voraussichtlich `ahead 12`.

## Bekannte offene Working-Tree-Reste

Bewusst nicht angefasst:

- `supabase/config.toml` (Line-Endings / bekanntes Rauschen)
- `.codex-*.log`
- `.playwright-cli/`
- `output/`
- alte untracked `docs/plans/2026-04-2*-handover.md`
- `docs/plans/2026-04-26-ai-testnutzer-cleanup-dry-run-bericht.md`
- `scripts/disable-supabase-legacy-jwts.sh`
- `scripts/rotate-twilio-oneshot.sh`

Nicht loeschen oder aufraeumen, ausser Thomas bittet ausdruecklich darum.

## Was in dieser Session passiert ist

### 1. Pilot-Rollen-Onboarding lokal committet

Commit:

- `7a19c7a Add pilot role onboarding`

Ergebnis:

- Registrierung fragt nach Pilotrolle:
  - `resident` - App fuer mich selbst
  - `caregiver` - ich unterstuetze jemanden
  - `helper` - ich helfe im Quartier
  - `test_user` - ich teste nur
- Speicherung ohne Migration in `users.settings.pilot_role`.
- Bei `test_user` zusaetzlich:
  - `settings.is_test_user = true`
  - `settings.test_user_kind = "pilot_onboarding"`
  - `settings.must_delete_before_pilot = true`
- Admin-Nutzerverwaltung zeigt und filtert Pilotrollen.

### 2. Pilotrolle UX verbessert

Commit:

- `fc3114e Polish pilot role selection flow`

Ergebnis:

- Rollenkarte wird erst ausgewaehlt.
- Weiter zur KI-Auswahl erfolgt erst ueber eigenen Button.
- Ausgewaehlte Rolle wird visuell markiert.
- Testnutzer sehen vor dem Weitergehen einen Hinweis zur Bereinigung.

### 3. Onboarding als Visitenkarte aufgewertet

Commit:

- `f3fb950 Elevate pilot onboarding story`

Ergebnis:

- Register-Header ist staerker auf Nachbar.io und gute Nachbarschaft ausgerichtet.
- Erster Screen erklaert das soziale Projekt hinter Nachbar.io.
- Info-Button `Was Sie wissen sollten` erklaert:
  - warum Nachbar.io existiert
  - was im Pilot passiert
  - welche Daten abgefragt werden
- Rollen-Screen hat Info-Button `Rollen und Pilot erklaeren` mit:
  - Zweck der Rollenfrage
  - Rollenerklaerung
  - Testkonto-Erklaerung
  - KI-Hinweis

Wichtig:

- Der In-App-Browser zeigte zwischendurch alte Inhalte + Hydration-Meldungen, sehr wahrscheinlich wegen Service-Worker/HMR-Cache.
- Frischer HTTP-Check und Playwright-Kontext zeigten die neue Version korrekt.

### 4. Admin zeigt Cleanup-Marker

Commit:

- `ec1cab0 Show pilot cleanup markers in admin`

Ergebnis:

- Admin-Nutzerliste zeigt `Vor Pilot loeschen`, wenn `settings.must_delete_before_pilot = true`.
- Statistik-Pille zeigt Anzahl der vor Pilot zu loeschenden Testkonten.
- Kein Cleanup-Execute gebaut.

### 5. Pi-5-Hardware-Karteileiche entfernt

Commit:

- `f08381b chore(cleanup): remove raspberry-pi/ folder (Pi 5 retired)`

Ergebnis:

- Nur `raspberry-pi/` entfernt:
  - `raspberry-pi/README.md`
  - `raspberry-pi/setup.sh`
  - `raspberry-pi/gpio-bridge/*`
- `npx tsc --noEmit` war danach gruen.
- Grep fand verbleibende `raspberry-pi/gpio-bridge/nachbar-terminal`-Referenzen nur noch in Archivdoku.

### 6. Kiosk-Webbereich geparkt, nicht geloescht

Commits:

- `a22045c Document kiosk route group deprecation precheck`
- `6db1a4f Mark kiosk web routes as parked`

Entscheidung Thomas:

Option B: alter Web-Kiosk bleibt im Code, wird aber geparkt.

Ergebnis:

- `/kiosk` zeigt Banner `Kiosk-Bereich geparkt`.
- Keine Kiosk-Routes, APIs, Notfallpfade, Caregiver-Kiosk-Funktionen oder Terminal-Dateien geloescht.
- Detaildoku:
  - `docs/plans/2026-04-27-kiosk-route-group-deprecation-precheck.md`
- Entscheidungslog im Firmen-Gedaechtnis wurde lokal ergaenzt:
  - `firmen-gedaechtnis/03_Entscheidungen/Entscheidungslog.md`

## Verifikation in dieser Session

Gruen gelaufen:

```powershell
npm test -- UserManagementPilot register-pilot-role register-complete-bugfix
npx tsc --noEmit
npx eslint "app/(auth)/register/page.tsx" "app/(auth)/register/components/RegisterStepEntry.tsx" "app/(auth)/register/components/RegisterStepPilotRole.tsx" "__tests__/app/register-entry.test.tsx" "__tests__/app/register-pilot-role.test.tsx" "app/(app)/admin/components/UserManagement.tsx" "__tests__/components/admin/UserManagementPilot.test.tsx"
npm test -- register-entry register-pilot-role register-complete-bugfix UserManagementPilot
```

Letzter gezielter Teststand:

```text
4 Test Files passed
26 Tests passed
```

Browser-/Visual-Checks:

- `http://localhost:3001/` zeigt Closed-Pilot-Seite.
- `http://localhost:3001/register` zeigt neue Onboarding-Story im frischen Playwright-Kontext.
- `http://localhost:3001/kiosk` zeigt Park-Banner; Landscape-Screenshot 1280x800 sah sauber aus.
- `/admin` ohne Session redirectet auf `/login`.

## Aktuelle lokale Server-Situation

- `localhost:3000` war Alltagslotse, nicht Nachbar.io.
- Nachbar.io lief auf `http://localhost:3001`.
- Ein Versuch, Nachbar.io auf `3010` zu starten, wurde von Next abgelehnt, weil bereits ein Nachbar.io Dev-Server auf `3001` lief.
- Dabei entstanden neue Logs:
  - `.codex-smoke-3010.log`
  - `.codex-smoke-3010.err.log`

Diese Logs nicht ungefragt loeschen.

## Naechster sinnvoller Arbeitsblock

Empfehlung:

1. Weiter am Pilot-Onboarding als hochwertige Visitenkarte arbeiten.
2. Besonders:
   - Rollen-Screen visuell auf das gleiche Niveau wie Einstieg bringen.
   - KI-Einwilligungs-Screen warm, klar und vertrauensbildend erklaeren.
   - Mobile-Screenshots pruefen.
   - Bei Bedarf Info-Panels kuerzen, damit der erste Eindruck nicht zu textlastig wird.

Nicht als naechstes:

- `/api/kiosk/companion` loeschen.
- ganze `(kiosk)`-Route-Group loeschen.
- Cleanup-Execute fuer Testnutzer bauen.
- Push/Deploy/Prod-Schritte.

## Empfohlener Start fuer naechste Session

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
git log --oneline -12
git diff --stat
npm test -- register-entry register-pilot-role register-ai-consent register-complete-bugfix UserManagementPilot
npx tsc --noEmit
```

Wenn UI weiterbearbeitet wird:

```powershell
npx eslint "app/(auth)/register/page.tsx" "app/(auth)/register/components/RegisterStepEntry.tsx" "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx"
```

## Wichtig fuer naechste Person

- Thomas bewertet das Onboarding als Schluessel: Es soll die App erklaeren, Menschen zum Nutzen motivieren und das soziale Herz des Projekts zeigen.
- Ton: warm, menschlich, vertrauensbildend, aber kein Startup-Hype.
- Zielgruppe: Nachbarn, Senioren, Angehoerige, Helfer in Bad Saeckingen.
- Medizin-/Pflege-/Telemedizin-Grenzen strikt beachten.
- DSGVO/AVV/HR-Block weiterhin ernst nehmen.
