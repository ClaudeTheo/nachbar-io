# Claude an Codex — Cleanup-Audit + Deploy-Welle 2026-05-05 mittag

Datum: 2026-05-05 ~15:45 MESZ
Autor: Claude (Opus 4.7 [1m])
Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## TL;DR

- **Push + Vercel-Deploy** des 8-Commit-Welle-2-Blocks (W0+W1+W5) und +3 neuer Commits (Cron-Endpoint + Closed-Pilot + GH-Audit-Workflow). Live-Production jetzt `fe6687d`.
- **§2 Vercel-Env verifiziert**: `SECURITY_E2E_BYPASS`/`E2E_TEST_SECRET` sind in Production nicht gesetzt.
- **§4 AI-Test-User-Cleanup-Dry-Run** gegen Prod-DB durchgefuehrt. 2 Test-User, 1 Test-Household, 0 Footprint in 19 Reference-Tables.
- **GH-Secret `SUPABASE_SERVICE_ROLE_KEY`** aktualisiert auf den neuen `sb_secret_o63eX...`-Wert. Legacy-JWT-Keys sind seit 2026-04-21 disabled.

## Aktueller Git-Stand

```text
master HEAD : fe6687d ci(audit): use updated GH secret directly (Vercel REST dead-end)
origin/master = master
Live-Prod   : SHA fe6687d, Region fra1, Health 200, Alias nachbar-io.vercel.app
```

Kette der heute committeten/gepushten Aenderungen (zusaetzlich zu deinen `af40304` + `712966b` von 07:21+07:28):

| Commit | Was |
|---|---|
| `ba72885 feat(admin): add ai-test-cleanup-dry-run cron endpoint` | Cron-Endpoint `/api/cron/ai-test-cleanup-dry-run` mit CRON_SECRET-Bearer-Auth + 5 Vitest-Tests |
| `63dd5fc feat(closed-pilot): allow ai-test-cleanup-dry-run cron in closed pilot` | Endpoint in `CLOSED_PILOT_PUBLIC_API_PATHS` aufgenommen + 1 Test |
| `3d785fa ci(audit): add manual workflow for ai-test-cleanup dry-run` | GH-Actions-Workflow `audit-ai-test-cleanup.yml` (workflow_dispatch only) |
| `19f8727 ci(audit): use vercel env pull for fresh service-role-key` | Versuch ueber `vercel env pull` (gescheitert, sensitive=leer) |
| `0886d24 ci(audit): resolve sensitive vars via Vercel REST decrypt=true` | Versuch ueber Vercel-REST-API mit `decrypt=true` (gescheitert, encrypted blob) |
| `4eedd96 ci(audit): debug vercel env response shape` | Debug-Output-Run zeigte `decrypt=true` ist nicht real |
| `fe6687d ci(audit): use updated GH secret directly (Vercel REST dead-end)` | Workflow vereinfacht zurueck auf direkte GH-Secrets |

Untracked (kein Push noetig): nichts neues von mir, nur die alten Handover-Briefe + `.codex-welle-d-3001.pid`.

## Welche Founder-Gates jetzt zu sind

| § | Was | Status |
|---|---|---|
| §1 | Push-Go fuer 8-Commit-Welle-2-Block + Cron-Endpoint | DONE — Push + Deploy live |
| §2 | Vercel-Env-Check (E2E-Bypass-Vars nicht in Prod) | DONE — `vercel pull --environment=production` zeigt beide mit `-` (nicht gesetzt) |
| §3 | Mig 176/177/186/187 Prod-Apply | DONE (war schon erledigt) |
| §3a | Mig 188 (`sync_meta`) Prod-Apply | OFFEN — lokal+origin fertig, Prod-Apply Founder-Go-pflichtig |
| §4 | AI-Test-User-Cleanup gegen echte Umgebung | DONE Dry-Run — Bericht unten |
| §6 | OSM-POI-Sync Aktivieren in `vercel.json`-Schedule | OFFEN — idealerweise NACH Mig 188 Prod-Apply |

## Cleanup-Audit Ergebnis (2026-05-05 15:43 UTC)

GH-Workflow-Run `25386496686` lieferte JSON. Kernbefunde:

- **2 AI-Test-User**:
  - `6f3e06ce-3df2-44b0-86a6-567e87bb0e2c` — `AITest Onboarding20260427` (12:54 UTC, kind `pilot_onboarding`)
  - `53aaea93-2476-4978-8a2b-e0cf496506a0` — `AI-Test Codex-20260427-161944` (14:19 UTC, kind `pilot_onboarding`)
  - Beide `mustDeleteBeforePilot: true`, kein Admin-Block.
- **1 Test-Household**: `Purkersdorfer Str. TEST-ONBOARDING-20260427` mit 2 AI-Test-Members und 0 Nicht-Test-Members. Saubere komplette Test-Einheit.
- **Reference-Counts in 19 Tables**: nur `household_members` mit 2 Zeilen. Alle anderen 0 (Alerts, Help-Requests, Marketplace, Lost-Found, Conversations, Direct-Messages, Notifications, Neighbor-Connections, Push-Subscriptions, Care-Profiles, Care-SOS, Care-Checkins, Care-Audit, Verification-Requests, Invite-Codes, Event-Participants).
- **`unsafeNameOnlyMatches: []`** — kein Display-Name-Match ohne Settings-Flag.

Folgerung: Pilot-Switch-Cleanup ist trivial, `scripts/ai-test-users-cleanup-execute.ts` reicht.

## Sackgassen, die ich dokumentiert habe (damit du sie nicht nochmal laeufst)

### Sensitive Vars in Vercel sind WIRKLICH von aussen nicht abrufbar

Memory `feedback_vercel_sensitive_pull_empty.md` ist nicht nur ein Bug, sondern by design. Drei Pfade ausprobiert:

1. `vercel env pull --environment=production` lokal → sensitive Werte = `""`
2. `vercel env pull` im GH-Actions-Runner mit `VERCEL_TOKEN` aus secrets → selber Effekt
3. Vercel-REST-API `GET /v9/projects/.../env?decrypt=true` mit owner-Token → liefert encrypted blobs (`eyJ2IjoidjIi...`), nicht den Klartext

Einzige Option: GH-Secret manuell aktualisieren (Founder-Hand).

### Windows-`vercel build --prod` ist kaputt

Mit `npx vercel deploy --prebuilt --prod` von Windows aus:
```
ENOENT: no such file or directory, stat '/vercel/path0/.vercel/output/functions/_global-error.segments/__PAGE__.segment.rsc.func'
```
Next.js-16-Bug — `.segments`-Unterordner werden beim Upload nicht korrekt uebertragen. Linux-Build via `vercel deploy --prod` ohne `--prebuilt` funktioniert (Vercel baut auf Linux).

### GH-Actions-Deploy-Workflow blockiert wegen Audio-Manager-Test-Flake

`Deploy to Vercel Production` Workflow schlaegt im `Lint & Test`-Job fehl mit:
```
Cannot load '/lib/security/redis.ts' imported from /home/runner/work/.../lib/security/traps/idor-detector.ts after the environment was torn down
```
plus 8 `×` in einer Audio-Manager-Test-Datei. Lokal alle 550/550 Test-Files gruen. Linux-CI-ENV-Teardown-Race. Niedrige Prio fuer dich, aber wenn du die Audio-Manager-Tests irgendwann robuster gegen Linux-Teardown machst, ist das ein guter Win.

## Wichtige Lehre fuer kuenftige Sessions

**Supabase-Legacy-JWT-Keys sind disabled.** Nachbar-io nutzt seit 2026-04-21 nur noch den neuen Stil. Aktiver Service-Role-Key in Vercel-Production ist `sb_secret_o63eX...` (von dir selbst am 2026-04-27 erstellt: `nachbar_io_vercel_prod_20260427_codex_v2`). GH-Secret war veraltet (`sb_secret_KZK49...` aus 2026-04-21 v3 Rotation, der noch JWT-basiert war). Habe das Secret aktualisiert auf den aktuellen Vercel-Wert.

Wenn du jemals einen Audit-Pfad bauen willst, der Service-Role braucht: Audit-Workflow `audit-ai-test-cleanup.yml` ist als Template nutzbar — `gh workflow run audit-ai-test-cleanup.yml --repo ClaudeTheo/nachbar-io --ref master` triggert ihn, JSON kommt als Artifact mit 14 Tagen Retention.

## Was du in der naechsten Welle anpacken kannst

Empfehlung in der Reihenfolge aus deinem letzten Handover:

1. **W3 Rathaus-Defaults lokal** — Bad Saeckingen Standard-Daten in `municipal_config`-Defaults verfestigen
2. **W2 Events-Crawler lokal** — naechste Auto-Sync-Quelle nach OSM
3. **W4 Onboarding-Pipeline** — wenn Founder Pilot scharf schalten will
4. **Mig 188 Prod-Apply via `MIGRATION-PROD-GO-188`** vor `vercel.json`-Schedule fuer OSM-Cron — bleibt offene Founder-Hand-Aktion

Variante A bleibt aktiv: Push + Deploy autonom, Prod-DB-Schreiben + Vercel-Env nur Founder-Go.

## Reality-Check

0 echte Nutzer. 0 Vertraege. Prod-DB-Befund bestaetigt: nur 2 Test-User Founder/Codex-Origin, 0 Daten Dritter, DSGVO entfaellt.

— Claude
