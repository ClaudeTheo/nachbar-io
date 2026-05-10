---
date: 2026-05-10
from: Claude Opus 4.7 (1M context) — Session "hardcore-feistel"
to: Nächste Claude/Codex-Session
status: completed
tldr: Cron-Outage seit 2026-04-25 17:30 UTC behoben. Live wieder produktiv.
---

# Cron-Outage-Behebung — 2026-05-10

## Was war kaputt

Seit 2026-04-25 17:30 UTC schrieb **kein einziger** der 29 Vercel-Crons mehr einen Heartbeat.
DB-Beweis am 2026-05-10 16:22 UTC: alle `cron_heartbeats.last_run_at` ≤ 2026-04-25.

Symptom im Admin-Health-Dashboard: 2 Cron-Jobs als "FEHLER UEBERFAELLIG" sichtbar
(Woechentlicher Digest, Heartbeat-Eskalation), weil nur diese 8 von 29 in der `CRON_JOBS`-Map waren.

## Diagnose

Zwei-Layer-Block:

1. **Vercel WAF Regel R04 "Cron Endpoint Protection"** — blockt `/api/cron/*` ohne `Authorization`-Header (`X-Vercel-Mitigated: deny`). Das ist *korrekt* — Vercel-Crons rufen mit Header an, kommen durch.
2. **App-Layer Closed-Pilot 503** — `lib/supabase/middleware.ts:165-179` blockt jede API-Route ohne Supabase-User mit `503 closed_pilot`. Vercel-Crons haben keinen User → fielen alle in den Block. `CLOSED_PILOT_PUBLIC_API_PATHS`-Whitelist hatte nur 4 Pfade (davon 1 Cron: `ai-test-cleanup-dry-run`).

Das war der Killer. Wann genau closed-pilot aktiviert wurde, lässt sich aus Memory rekonstruieren — der Heartbeat-Stop am 2026-04-25 17:30 fällt zeitlich zusammen.

## Was getan wurde (3 Commits auf master)

| Commit | Welle | Effekt |
|---|---|---|
| `1df3fda` | Cron-Monitoring-Vollabdeckung | Wrapper `lib/care/with-cron-heartbeat.ts`, Map 8→29 Einträge, 16 Routen migriert, 4 Sonderfälle mit manuellem Heartbeat, 2× `as never`-Hack entfernt. -205 LOC netto. |
| `9e43189` | Closed-Pilot-Cron-Fix | Pattern-Match `/api/cron/*` und `/api/care/cron/*` in `isClosedPilotPublicApiPath`. News-Pfade explizit. Test-Coverage 28 Cron + 2 News + Negativ. |
| `fea4e62` | Test-Sync-Fix | `lib/care/cron-heartbeat.test.ts` (Duplikat des modules-Tests via Re-Export-Bridge) auf 29 Jobs synchronisiert. Hatte den ersten Deploy gebrochen. |

Tests: 173/173 grün auf 24 Files für die Cron-Welle, +37/37 für closed-pilot, +64/64 für die Map-Tests. tsc + lint clean.

Deployments via GH Actions `deploy.yml`:
- Run `25633299477` — failed (Test-Sync-Fix nötig)
- Run `25633476144` — success → live um 2026-05-10 ~16:24 UTC

## Verifikation

DB-Check 2026-05-10 16:31 UTC nach erstem `*/30`-Schedule um 16:30:

| Job | Letzter Run | Metadata |
|---|---|---|
| synthetic_smoke | 16:30:43 | passed=5, warned=1, failed=0 |
| escalation | 16:30:42 | checked=0 (synthetic-smoke triggert intern) |
| medications | 16:30:42 | missed=0 |
| heartbeat_escalation | 16:30:42 | skipped=no_active_links |

Outage geschlossen. Tägliche Crons (nina-sync 07:00, amtsblatt-sync Sa 08:00, etc.) erscheinen in den nächsten 24h zu ihrem regulären Schedule.

## Verbleibende offene Punkte

- **Issue 0015 reprocessen** (Rote Zone, Founder-Go): `POST /api/admin/amtsblatt/reprocess` mit `{issueId: "<id für 0015>"}` — stellt 80 Amtsblatt-Items wieder her, die bei Pilot-Reset mit-geleert wurden. Codex Welle K2 (`9e4a0a9`) baute den Endpoint dafür.
- **Auto-Memory Pass 27**: läuft automatisch via dream consolidation in den nächsten 24h. Wird Live=Master und neue Heartbeat-Stand mitziehen. Memory MEMORY.md vor Pass 27 noch auf `1e3eb08` Live-Stand und 28 ahead — beide veraltet.
- **NEXT_PUBLIC_PILOT_MODE vs NEXT_PUBLIC_CLOSED_PILOT_MODE**: in Vercel-Env existiert nur `NEXT_PUBLIC_PILOT_MODE` (vor 11 Tagen gesetzt). Der Code liest `NEXT_PUBLIC_CLOSED_PILOT_MODE` — diese Var ist gar nicht gesetzt, daher Default `!== "false"` = `true` (closed-pilot immer an). Das ist by design (closed-pilot bis explizit auf "false"), aber das Naming ist verwirrend. Bei künftiger Pilot-Öffnung: explizit `NEXT_PUBLIC_CLOSED_PILOT_MODE=false` setzen, nicht nur `NEXT_PUBLIC_PILOT_MODE` ändern.

## Lessons / Architektur-Hinweise

1. **Closed-Pilot-Whitelist mitziehen** wenn neue `/api/*`-Routen entstehen, die ohne Supabase-Session aufgerufen werden müssen (Webhooks, Crons, Service-zu-Service). Pattern-Match `/api/cron/*` deckt jetzt alle künftigen Cron-Routen automatisch ab.
2. **FMEA-Cron-Map mitziehen**: `modules/care/services/cron-heartbeat.ts` `CRON_JOBS` muss synchron mit `vercel.json` `crons[]` bleiben. Bei neuem Cron: Job-ID + Schedule-Erwartung in die Map und `withCronHeartbeat`-Wrapper im Route-Handler.
3. **Doppelte Test-Files beachten**: `lib/care/cron-heartbeat.test.ts` und `modules/care/services/cron-heartbeat.test.ts` testen denselben Code via Re-Export-Bridge. Beide bei Map-Erweiterungen aktualisieren — sonst CI rot.
4. **Outage-Erkennung verbessern**: Das Symptom war 30+ Tage offen, weil das Admin-Dashboard nur 8 von 29 Crons anzeigte. Mit der jetzt vollständigen Map ist die Sichtbarkeit gegeben — aber ein Slack/E-Mail-Alert bei FEHLER-Status (`FMEA FM-SYS-01`) wäre sinnvoll falls niemand das Dashboard regelmäßig prüft.

## HEAD-Stände

- master: `fea4e62`
- origin/master: `fea4e62`
- production deploy: `25633476144` → `fea4e62` live
