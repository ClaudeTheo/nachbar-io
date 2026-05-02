# Direkte Uebergabe — 2026-05-02 Abend

Stand: nach Chat-Notification-Fix, Production-Smoke, lokaler Pilot-Smoke-Welle, Production-Readiness-Audit und CI-Haertung.

## Harte Linien

- Kein weiterer Deploy nach `37b3bb5`.
- Kein Prod-DB-Write.
- Keine Prod-Migration.
- Keine Vercel-Env-Aenderung.
- Keine Feature-Flag-/Preset-Schalter.
- Keine echten Pflege-/Medizin-/Personendaten.
- Keine Windows-Prebuild-Deploys fuer Production.

## Aktueller Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Status vor dieser Uebergabe: `master...origin/master`
- Aktueller Remote-Head: `aea5fe4 ci(e2e): retry dependency install`

Letzte relevante Commits:

- `aea5fe4 ci(e2e): retry dependency install`
- `b9f8370 docs(handoff): record production readiness audit`
- `ba811ee docs(handoff): record local pilot smoke wave`
- `0de5eb8 docs(handoff): plan larger pilot followups`
- `37b3bb5 docs(handoff): record production deploy smoke`
- `a85c8c4 docs(handoff): record chat notification hygiene`
- `630fe9e fix(chat): allow contact notification delivery`

## Was erledigt wurde

### Chat-Notification-Fix

- Root Cause: 1:1-Chats nutzen `contact_links.status = 'accepted'`, aber Notification-Relationship-Check kannte diese Beziehung nicht.
- Fix: `checkUserRelationship()` erlaubt akzeptierte `contact_links` in beide Richtungen.
- 406-Noise im S12-Flow wurde durch `maybeSingle()` bei optionalen Reads reduziert.
- S12 lokal gruen.

### Push, CI und Production

- App-Fix wurde gepusht.
- CI fuer `a85c8c4`: CodeQL gruen, E2E Multi-Agent gruen.
- Production wurde per sicherem Remote-Build deployed.
- Kein Windows-Prebuild.
- Production steht auf `37b3bb5`.
- Vercel-Deployment: `dpl_u2ihJmeERAmoWW4wFTLkwwbxrcQV`
- Alias: `https://nachbar-io.vercel.app`
- State: `READY`
- Region: `fra1`

Hinweis: `0de5eb8`, `ba811ee`, `b9f8370` und `aea5fe4` sind Doku-/CI-Workflow-Follow-ups ohne Runtime-App-Code. Fuer sie wurde bewusst kein weiterer Production-Deploy ausgefuehrt.

### Welle A — lokaler Pilot-Smoke

Dokument: `docs/plans/2026-05-02-local-pilot-smoke-wave-a.md`

Verifikation:

- `npm run build:local`: gruen.
- `npm run start:local` auf Port 3001: gestartet und danach gestoppt.
- `npx playwright test --config=tests/e2e/playwright.config.ts --project=multi-agent --workers=1 --timeout=60000`: `80 passed`.
- Synthetische E2E-Testdaten wurden geseedet und per Teardown aufgeraeumt.

Bekannte lokale Noise:

- `STRIPE_SECRET_KEY nicht konfiguriert — Zahlungen deaktiviert`
- Upstash Redis lokal nicht konfiguriert / Security-Scoring fail-open
- fehlende Push-Subscriptions in lokalen Testnutzern
- einzelne Nachlauf-Console-Meldungen nach Testende

Nicht blockierend; der Lauf war gruen.

### Welle B — Production Readiness Read-only Audit

Dokument: `docs/plans/2026-05-02-production-readiness-wave-b.md`

Geprueft ohne Login und ohne Schreibaktion:

- `/`, `/login`, `/register`, `/datenschutz`, `/impressum`: 200
- `/api/health`, `/api/admin/health`, `/api/alerts`: 503 `closed_pilot`
- Browser-Console auf `/`, `/login`, `/register`, `/datenschutz`, `/impressum`, `/messages`, `/dashboard`, `/admin`: keine Console-Issues, keine 403/406/5xx.
- Geschuetzte unauthentifizierte Routen fuehren kontrolliert auf `/` zurueck.

### CI-Haertung

- Run `25259585620` fuer `b9f8370` wurde rot, aber Tests liefen nicht.
- Root Cause: `npm ci` scheiterte im Supabase-CLI-Postinstall beim Download/Entpacken von `supabase_linux_amd64.tar.gz` mit `incorrect header check` / `Z_DATA_ERROR`.
- Rerun bestaetigte denselben Install-Fehler.
- Fix: `.github/workflows/e2e-tests.yml` retryt `npm ci` jetzt bis zu 3x und bereinigt Cache/`node_modules` zwischen Versuchen.
- Commit: `aea5fe4 ci(e2e): retry dependency install`
- CI fuer `aea5fe4`: gruen.
- Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25259765046`

## Aktuelle Verifikation

Letzter gruener Remote-Run:

- `E2E Multi-Agent Tests` fuer `aea5fe4`: success
- `Smoke Tests (S7)`: success
- `Multi-Agent Tests (S1-S6)`: success

Lokaler Stand vor dieser Uebergabe:

- `git status --short --branch` -> `master...origin/master`

## Was als Naechstes kommt

### Naechster grosser Block: Welle C — Pilot-Onboarding-Polish lokal

Ziel: Die echte Pilot-Erfahrung fuer Familien verbessern, ohne Production, DB, Env oder Feature-Schalter anzufassen.

Vorgeschlagener Scope:

1. Register-Rollen-Screen visuell ruhiger und klarer machen.
2. KI-Consent-Screen waermer und verstaendlicher formulieren.
3. Mobile-Screenshots fuer Register-/Consent-Flow pruefen.
4. Senior-Mode-/Care-Einstiegsseiten stichprobenartig gegen 80-px-Touch-Targets und 4.5:1-Kontrast pruefen.

Arbeitsregeln fuer Welle C:

- Vor Umsetzung Pre-Check per `rg` auf bestehende Komponenten, Texte und Tests.
- Keine neue UI-Lib.
- Kein neues Design-System.
- TDD fuer sichtbare Logik oder Text-/State-Verhalten.
- Browser-/Screenshot-Verifikation nach UI-Aenderungen.
- Lokal committen nach gruenem Teststand.
- Push nur mit Founder-Go.
- Deploy nur mit gesondertem Founder-Go.

Empfohlener Start:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
rg -n "pilot_role|Pilot-Rolle|KI|Consent|Einwilligung|RegisterStep|AiConsent" app components modules __tests__
```

Danach zuerst die relevanten Register-Komponenten und Tests lesen, dann Welle C als konkrete kleine UI-Umsetzung starten.

## Nicht als Naechstes tun

- Keine Prod-Migrationen 176/177/178 anwenden.
- Keine AI-Test-User in Prod loeschen.
- Keine Vercel-Env-Sicherheitschecks mit Aenderung verbinden.
- Kein authentifizierter Prod-Chat-Test.
- Kein Deploy nur fuer Doku-/CI-Workflow-Commits.
