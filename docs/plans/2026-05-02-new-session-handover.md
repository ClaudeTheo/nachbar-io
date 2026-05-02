# New Session Handover — 2026-05-02

Stand: 2026-05-02 spaet abends, nach Chat-Fix, Production-Smoke, lokalen Pilot-Smokes, CI-Haertung und Pilot-Onboarding-Polish Welle C.

Diese Datei ist fuer eine neue Codex-Session gedacht. Erst diese Datei lesen, dann den Code und die verlinkten Handoffs pruefen. Plan- und Handoff-Texte sind hilfreich, aber der Code ist autoritativ.

## Harte Linien

- Kein Deploy ohne neues klares Founder-Go.
- Kein Prod-DB-Write.
- Keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Feature-Flag-/Preset-Schalter.
- Keine echten Pflege-/Medizin-/Personendaten.
- Keine authentifizierten Production-Smokes mit Testnutzern.
- Keine AI-Test-User oder andere Daten in Production loeschen.
- Keine Windows-Prebuild-Production-Deploys fuer iteratives Testen.

## Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Aktueller Head: `d3fa315 fix(register): polish pilot onboarding flow`
- Status beim Schreiben dieser Uebergabe vor dem neuen Doku-Commit: `master...origin/master`
- Letzter App-Code-Commit: `d3fa315`
- Letzter Production-Deploy: `37b3bb5 docs(handoff): record production deploy smoke`

Wichtig: Production steht bewusst nicht auf `d3fa315`. Nach `37b3bb5` wurden Doku-, CI- und Onboarding-Polish-Commits gepusht, aber kein weiterer Deploy ausgefuehrt.

## Relevante Commits

- `d3fa315 fix(register): polish pilot onboarding flow`
- `bd6d8c7 docs(handoff): add direct evening handover`
- `aea5fe4 ci(e2e): retry dependency install`
- `b9f8370 docs(handoff): record production readiness audit`
- `ba811ee docs(handoff): record local pilot smoke wave`
- `0de5eb8 docs(handoff): plan larger pilot followups`
- `37b3bb5 docs(handoff): record production deploy smoke`
- `a85c8c4 docs(handoff): record chat notification hygiene`
- `630fe9e fix(chat): allow contact notification delivery`

## Production-Stand

- Alias: `https://nachbar-io.vercel.app`
- Deployment: `dpl_u2ihJmeERAmoWW4wFTLkwwbxrcQV`
- Vercel-Meta: `githubCommitSha=37b3bb5a659eb66731f9b491188a0026062a513a`
- State: `READY`
- Region: `fra1`

Read-only Smoke nach Deploy:

- `/`, `/login`, `/register`, `/datenschutz`, `/impressum`: 200
- `/api/health`, `/api/admin/health`, `/api/alerts`: 503 `closed_pilot`, erwartet
- Browser-Probe auf oeffentlichen und geschuetzten unauthentifizierten Routen: keine Console-Issues, keine 403/406/5xx

Dokument: `docs/plans/2026-05-02-production-readiness-wave-b.md`

## Was erledigt wurde

### 1. Chat-Notification + 406/403-Hygiene

Root Cause:

- 1:1-Chats sind seit Migration 161 kontaktbasiert ueber `contact_links.status = 'accepted'`.
- `lib/services/notifications.service.ts` erlaubte Notifications aber nicht fuer akzeptierte Kontakte.
- Ergebnis im S12-Flow: Chat war erlaubt, Notification-Create konnte mit 403 blocken.

Fix:

- `checkUserRelationship()` erlaubt akzeptierte `contact_links` in beide Richtungen.
- Bestehender Quartier-Check bleibt als Fallback.
- Optionale Profil-/Haushaltsreads in Messages und QuarterProvider nutzen `maybeSingle()` statt `single()`, damit optionale Null-Ergebnisse keine sichtbaren Supabase-406-Errors erzeugen.

Verifikation:

- Neue RED-Tests fuer 403 und `.single()`-Noise.
- Danach Vitest, ESLint, TypeScript, `build:local` gruen.
- S12 lokal gegen `start:local` auf Port 3001: 3 passed, ohne die vorherigen 406/403-Console-Errors.

Dokument: `docs/plans/2026-05-02-chat-notification-406-handover.md`

### 2. Push, CI und Production-Deploy

- Fix-Commit `630fe9e` und Handoff `a85c8c4` gepusht.
- CI fuer `a85c8c4`: CodeQL success, E2E Multi-Agent success.
- Danach Production-Deploy ausgefuehrt.
- Spaeter wurde nach Doku-Commit `37b3bb5` nochmals deployed.
- Kein Prod-DB-Write, keine Prod-Migration, keine Vercel-Env-Aenderung.

Wichtig: Nach `37b3bb5` gab es keinen weiteren Production-Deploy.

### 3. Welle A — lokaler Pilot-Smoke

Dokument: `docs/plans/2026-05-02-local-pilot-smoke-wave-a.md`

Ausgefuehrt lokal gegen lokalen Supabase-Stack und `start:local` auf Port 3001:

```powershell
npm run build:local
$env:E2E_BASE_URL="http://localhost:3001"
$env:E2E_LIVE="true"
$env:E2E_CLEANUP="true"
$env:E2E_TEST_SECRET="e2e-test-secret-dev"
npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --workers=1 --timeout=60000
```

Ergebnis:

- `npm run build:local`: gruen
- Multi-Agent-Pilot-Suite: `80 passed`
- Synthetische E2E-Testdaten wurden geseedet und per Teardown bereinigt.
- Port 3001 danach gestoppt.

### 4. Welle B — Production Readiness, read-only

Dokument: `docs/plans/2026-05-02-production-readiness-wave-b.md`

Scope:

- Kein Login.
- Keine Schreibaktion.
- Keine echten Nutzer.
- Nur HTTP- und Browser-Console-Smoke gegen Production.

Ergebnis:

- Oeffentliche Routen erreichbar.
- Closed-Pilot-Guards kontrolliert.
- Keine 403/406/5xx-Probleme in der unauthentifizierten Probe.

### 5. CI-Haertung gegen Supabase-CLI-Postinstall-Flake

Problem:

- CI fuer `b9f8370` fiel in `npm ci`, bevor Tests liefen.
- Ursache: Supabase-CLI-Postinstall konnte `supabase_linux_amd64.tar.gz` nicht sauber entpacken (`incorrect header check`, `Z_DATA_ERROR`).

Fix:

- `.github/workflows/e2e-tests.yml` retryt `npm ci` jetzt bis zu 3x.
- Zwischen Versuchen werden npm cache und `node_modules` bereinigt.
- Commit: `aea5fe4 ci(e2e): retry dependency install`

Verifikation:

- CI fuer `aea5fe4`: success.
- Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25259765046`

### 6. Welle C — Pilot-Onboarding-Polish

Dokument: `docs/plans/2026-05-02-pilot-onboarding-polish-wave-c.md`

Commit:

- `d3fa315 fix(register): polish pilot onboarding flow`

Geaendert:

- `RegisterStepIdentity`
  - Inline-Styles entfernt, damit lokale Preview keine React-Hydration-Warnung mehr erzeugt.
  - Honeypot und Mindesthoehen laufen ueber Tailwind-Klassen.
- `RegisterStepPilotRole`
  - Hinweis: Rolle kann spaeter geaendert werden.
  - Rollen-Cards mindestens 80 px hoch.
  - Primaerbutton mit groesserer Mindesthoehe.
- `RegisterStepAiConsent`
  - Explizite KI-Einwilligung als 80-px-Touch-Ziel.
  - Primaerbutton mit groesserer Mindesthoehe.
  - Zurueck fuehrt jetzt zur Pilot-Rolle statt direkt zur Identity-Seite.

Tests:

- Neue RED-Tests fuer Spaeter-aendern-Copy, 80-px-KI-Touch-Ziel, Zurueck-Navigation und Inline-Style-Vermeidung.
- Danach:

```powershell
npx vitest run __tests__/app/register-identity.test.tsx __tests__/app/register-pilot-role.test.tsx __tests__/app/register-ai-consent.test.tsx
npx eslint 'app/(auth)/register/components/RegisterStepIdentity.tsx' 'app/(auth)/register/components/RegisterStepPilotRole.tsx' 'app/(auth)/register/components/RegisterStepAiConsent.tsx' '__tests__/app/register-identity.test.tsx' '__tests__/app/register-pilot-role.test.tsx' '__tests__/app/register-ai-consent.test.tsx' --no-warn-ignored
npx tsc --noEmit
npm run build:local
```

Ergebnis:

- Vitest: 3 Dateien / 23 Tests passed
- ESLint: gruen
- TypeScript: gruen
- `build:local`: gruen

Browser-Preview:

- Lokaler Development-Server auf Port 3000 war bereits vorhanden und wurde genutzt.
- `http://localhost:3000/register/preview/identity`: 200, keine Console-Warnings/Errors im finalen Lauf
- `http://localhost:3000/register/preview/pilot-role`: 200, keine Console-Warnings/Errors
- `http://localhost:3000/register/preview/ai-consent`: 200, keine Console-Warnings/Errors
- Screenshots lokal unter `tmp/welle-c-register-screenshots/`, gitignored.

CI nach Push:

- CodeQL Run `25261544575`: success
- E2E Multi-Agent Run `25261544580`: success
- `Smoke Tests (S7)`: success
- `Multi-Agent Tests (S1-S6)`: success

## Bekannte lokale Noise

Nicht neu, nicht fuer diese Session geloest:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
- Upstash Redis lokal nicht konfiguriert; Security-Scoring lokal fail-open
- Lokale Testnutzer ohne Push-Subscription erzeugen 503/429 Push-Noise in manchen E2E-Kontexten
- Ein Dev-Server auf Port 3000 lief bereits vor der Welle-C-Preview. Nicht automatisch stoppen, wenn nicht klar ist, dass er von der aktuellen Session gestartet wurde.

## Aktueller Betriebszustand

- Git vor dieser neuen Uebergabe: sauber und synchron mit `origin/master`.
- Port 3001 wurde nicht offen gelassen.
- Production unveraendert auf Deployment zu `37b3bb5`.
- Keine Prod-Daten oder Prod-Konfiguration wurden nach Welle C angefasst.

## Naechster sinnvoller Block

### Welle D — Senior/Care Entry Spot-Check lokal

Ziel: Senior- und Care-Einstiege auf sichtbare Pilot-Tauglichkeit pruefen, ohne Production und ohne echte Daten.

Start:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
rg -n "Notfall|112|110|Senior|Care|Einwilligung|Touch|sos|consent" app components modules __tests__
```

Zu pruefende lokale Routen:

- `/senior`
- `/senior/home`
- `/care`
- `/care/consent`

Pruefpunkte:

- Senior Mode: min. 80 px Touch-Targets dort, wo es Senior-Primaraktionen sind.
- Notfall-Banner/Notfallaktionen: Kategorien fire/medical/crime muessen 112/110 zuerst zeigen, vor allem anderen.
- Keine offensichtlichen mobilen Overflows.
- Keine Browser-Console-Warnings/Errors.
- Keine 403/406/5xx-Noise in erwartbaren lokalen Flows.
- Care-Consent-Texte: freiwillig, widerrufbar, keine falschen Schutzversprechen.

Arbeitsweise:

- Pre-Check vor jeder neuen Komponente/Lib/Route.
- TDD fuer Verhalten, Copy-Guards und Regressionen.
- Kleine, lokal verifizierbare Patches.
- Nach Aenderung: Vitest der betroffenen Tests, ESLint der betroffenen Dateien, `npx tsc --noEmit`, bei UI `build:local` und Browser-Preview.
- Lokal committen nach gruenem Stand.
- Push nur mit Founder-Go. Ein frueheres Push-Go lag in dieser Session vor, aber in einer neuen Session im Zweifel kurz bestaetigen lassen.

## Was nicht als Naechstes tun

- Kein Deploy nur wegen Welle C oder dieser Doku.
- Keine Prod-Migrationen 176/177/178 anwenden.
- Keine Prod-DB-Drift "aufräumen".
- Keine Vercel-Env-Pruefung mit Aenderung verbinden.
- Kein authentifizierter Production-Chat-Test.
- Keine Feature-Flags im Admin umstellen.
- Keine neue UI-Lib oder neues Design-System einfuehren.
- Nicht codebase-weit pauschal `.single()` ersetzen. Wenn 406 wieder auftaucht: erst konkrete Response-URLs sammeln.

## Schnellstart fuer neue Session

1. Dieses Handover lesen.
2. `git status --short --branch` ausfuehren.
3. `git log --oneline --decorate -8` pruefen.
4. Wenn Thomas "weiter" sagt: Welle D lokal starten.
5. Wenn Thomas "deploy" sagt: erst klaeren, ob wirklich Production gemeint ist, und vorher CI-Stand und Ziel-Commit nennen.
6. Wenn Thomas "push" sagt: nach Commit pushen und GitHub Actions abwarten.
