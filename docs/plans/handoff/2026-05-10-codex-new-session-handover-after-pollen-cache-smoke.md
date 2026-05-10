# New-Session-Handover Codex — nach Build, Browser-Smoke und Pollen-Cache-Fix

Datum: 2026-05-10
Repo: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
Branch: `master`

## Aktueller Git-Stand

Zum Zeitpunkt dieser Uebergabe:

```text
## master...origin/master [ahead 3]
HEAD: 7f192a7 fix(info-hub): refresh legacy pollen cache region
origin/master: 6e95355 docs(handoff): update 2026-05-10 — wellen 5-8 + offene punkte fuer naechste session
```

Es wurde **nicht gepusht**.

Lokale Ahead-Commits:

```text
7f192a7 fix(info-hub): refresh legacy pollen cache region
073985e docs(handoff): new session after QA cron infohub
60ae46e docs(handoff): codex QA after cron infohub fixes
```

## Was Codex in dieser Session getan hat

Thomas bat, in `nachbar-io` weiterzumachen:

1. Vorgaben gelesen:
   - `AGENTS.md`
   - `docs/plans/handoff/INBOX.md`
   - `docs/plans/handoff/2026-05-10-codex-new-session-handover-after-qa-cron-infohub.md`
   - `docs/plans/handoff/2026-05-10-codex-an-claude-qa-nach-cron-infohub-fixes.md`
2. `git status --short --branch` geprueft.
3. Build in saubererer Umgebung erneut getestet.
4. Browser-Smoke auf lokalem `npm run dev` geplant und ausgefuehrt.
5. Im Browser-Smoke einen echten Pollen-Cache-Drift gefunden.
6. Den Drift test-first gefixt, lokal verifiziert und committed.

## Build-Nachtest

Der vorherige QA-Blocker war:

```text
npm run build
Exit 1
Could not determine Node.js install directory
VirtualAlloc failed
```

In dieser Session lief `npm run build` zunaechst ohne Codeaenderung erfolgreich durch:

```text
npm run build
Exit 0
Compiled successfully
Generating static pages (234/234)
```

Nach dem Pollen-Cache-Fix wurde `npm run build` erneut ausgefuehrt und war ebenfalls gruen.

## Browser-Smoke

Lokaler Server:

```text
npm run dev
http://localhost:3000
Environments: .env.development.local, .env.local
```

Port-Hinweis:

- `3001` ist durch `tailscaled` belegt.
- Fuer den Smoke wurde daher `3000` genutzt.
- Der von Codex gestartete Dev-Server wurde am Ende wieder gestoppt; Port 3000 war danach frei.

Gepruefte Flows:

```text
/                         Closed-Pilot-Startseite rendert, Console clean
/login                    Login-Seite rendert, Console clean
/onboarding-anleitung     Link "Was ist QuartierApp?" funktioniert
/admin                    Admin-Dashboard rendert nach Zugriffspruefung
/admin                    Onboarding-Pipeline rendert
/admin                    Amtsblatt-Pipeline rendert
/quartier-info            Info-Hub rendert
/api/health               HTTP 200 {"status":"ok"}
```

Browser-Runtime-Limit:

- Das Automations-Tool konnte ein `type=email`-Feld nicht per `fill/type` bedienen (`setRangeText` auf `HTMLInputElement type=email`).
- Deshalb wurde fuer Interaktionsnachweis ein echter Link-Klick und Admin-Panel-Klicks genutzt.
- Das ist kein App-Befund.

## Gefundener Befund

Auf `/quartier-info` zeigte die UI:

```text
Bad Säckingen — Purkersdorfer/Sanary/Rebberg
Region: Hohenlohe/mittlerer Neckar/Oberschwaben — Heute
```

Das widersprach Claudes Commit:

```text
45bd0df fix(pollen): default region 112 -> 113
```

Root Cause:

- `fetchPollenData()` hat inzwischen Default `113`.
- `getQuartierInfo()` nimmt aber zuerst `quartier_info_cache`.
- Ein gueltiger alter Cache-Eintrag mit Region `Hohenlohe/...` wurde weiter ausgeliefert.
- `runQuartierInfoSync()` aktualisierte Pollen nur einmal pro Tag und haette einen heutigen Legacy-Cache deshalb ebenfalls nicht ueberschrieben.

## Fix in `7f192a7`

Geaenderte Dateien:

```text
modules/info-hub/services/pollen-client.ts
lib/services/quartier-info.service.ts
modules/info-hub/services/quartier-info-sync.service.ts
__tests__/lib/quartier-info.service.test.ts
docs/plans/handoff/INBOX.md
```

Inhalt:

- Neuer Helper `isLegacyDefaultPollenRegion(value)`.
- `getQuartierInfo()` ignoriert Legacy-Hohenlohe-Pollencache und holt live neu.
- `runQuartierInfoSync()` selektiert zusaetzlich `data` und aktualisiert auch dann, wenn `lastFetch === today`, sobald der alte Hohenlohe-Default im Cache liegt.
- Neuer Regressionstest: alter Hohenlohe-Cache wird nicht mehr ausgeliefert.

Browser-Nachweis nach Fix:

```text
/quartier-info
Region: Mittelgebirge Baden-Württemberg — Heute
hasHohenlohe: false
Console errors/warnings: []
```

## Verifikation

Gruen:

```text
npx vitest run __tests__/lib/quartier-info.service.test.ts
Test Files  1 passed
Tests       7 passed
Exit        0
```

```text
npx eslint lib/services/quartier-info.service.ts modules/info-hub/services/pollen-client.ts modules/info-hub/services/quartier-info-sync.service.ts __tests__/lib/quartier-info.service.test.ts
Exit 0
```

```text
npx tsc --noEmit
Exit 0
```

```text
git diff --check
Exit 0
Nur CRLF-Warnungen
```

```text
npm run build
Exit 0
```

Browser:

- Homepage, Login, Onboarding-Anleitung, Admin-Dashboard, Onboarding-Pipeline, Amtsblatt-Pipeline und Quartier-Info ohne Framework-Overlay.
- Console-Logs fuer die geprueften Browser-Zustaende ohne relevante Error/Warn-Eintraege.

## Bekannte Untracked-Dateien

Weiterhin nicht anfassen, ausser Thomas sagt es ausdruecklich:

```text
.codex-welle-d-3001.pid
docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md
docs/plans/handoff/2026-05-03-claude-an-codex-due-diligence-review.md
docs/plans/handoff/2026-05-03-claude-an-codex-founder-go-vollmacht-grosse-schritte.md
docs/plans/handoff/2026-05-03-claude-an-codex-m4-foerderlogik-korrektur.md
docs/plans/handoff/2026-05-03-claude-an-codex-vollgas-bis-100-dann-sicherheit.md
docs/plans/handoff/2026-05-03-codex-an-claude-due-diligence-review.md
docs/plans/handoff/2026-05-04-claude-an-codex-owasp-audit-5-neue-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-quittung-phase4-findings.md
docs/plans/handoff/2026-05-04-claude-an-codex-security-zweitmeinung.md
docs/plans/handoff/2026-05-04-codex-new-session-handover-security-ci-health-deploy.md
docs/plans/handoff/2026-05-09-claude-an-claude-cleanup-skript-erweiterung.md
docs/plans/handoff/2026-05-10-codex-an-claude-bestaetigung-pilot-reset.md
docs/plans/handoff/2026-05-10-codex-new-session-handover-after-pilot-reset-confirmation.md
scripts/manual-cron-trigger-2026-05-10.ts
scripts/reprocess-amtsblatt-issue-0015.ts
```

Die beiden Scripts klingen nach Live-/Cron-/Reprocess-Handaktionen. Nicht ausfuehren ohne klares Founder-Go.

## Rote Zone

Weiterhin nicht ohne explizites Founder-Go:

- Kein Push.
- Kein Deploy.
- Kein Prod-DB-Write, kein Migration-Apply.
- Kein Aufruf von Manual-Cron-/Reprocess-Scripts gegen Prod.
- Keine Vercel-Env-/Secrets-/Billing-Aenderung.
- Keine Provider-Live-/KI-Kostenaktion.

## Naechster sinnvoller Schritt

1. `git status --short --branch` lesen.
2. Diese Handover-Datei lesen.
3. Bei Bedarf kurze Review der `7f192a7`-Diff.
4. Falls Thomas Push-Go gibt: vor Push mindestens `git status`, relevante Tests/Build-Lage nennen und dann erst pushen.
5. Ohne Push-Go: weiter lokal an naechster kleinen Aufgabe arbeiten.

## Startprompt fuer naechste Session

```text
Bitte in `C:\Users\thoma\Claud Code\Handy APP\nachbar-io` weitermachen.
Zuerst lesen:
- `AGENTS.md`
- `docs/plans/handoff/INBOX.md`
- `docs/plans/handoff/2026-05-10-codex-new-session-handover-after-pollen-cache-smoke.md`

Dann `git status --short --branch` pruefen.
Kein Push/Deploy/Prod-DB-Write/Vercel-Env/Secrets/Billing/Provider-Live ohne Founder-Go.
Aktueller lokaler Stand ist ahead 3; HEAD `7f192a7` fixt Legacy-Hohenlohe-Pollencache nach dem Region-113-Fix.
```
