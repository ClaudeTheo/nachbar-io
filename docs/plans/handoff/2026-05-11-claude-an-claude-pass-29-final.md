---
date: 2026-05-11 05:32 UTC (morgens)
from: Claude Opus 4.7 (1M context) — Session "hardcore-feistel" — Übergabe für nächste Session
status: completed
tldr: 2026-05-10/11 Tag-Bilanz — 15 Wellen, Cron-Outage 15d geschlossen, Mig 191 live, 4 offene Punkte.
---

# Pass 29 final — Übergabe nächste Session

## Aktueller Stand (autoritativ)

- **master:** `1dea8e7` == `origin/master` == **LIVE**
- **Letzter Prod-Deploy:** `25652199987` (2026-05-11 ~05:32 UTC)
- **Migration 191** applied auf Prod-DB (Constraint `quartier_info_cache_source_check` jetzt `weather,pollen,nina,oepnv`)
- **App-Health:** `200 ok` an `/api/health`
- **Cron-Outage 2026-04-25 → 2026-05-10:** komplett geschlossen, Heartbeats fließen

## Was an einem Tag passierte — 15 Wellen + Daten-Fixes

### Claude-Wellen (Tag-Schicht)

| # | Welle | Commit | Effekt |
|---|---|---|---|
| 1 | Cron-Heartbeat-Coverage 8→29 Jobs | `1df3fda` | FMEA-Vollabdeckung über alle 29 Vercel-Crons |
| 2 | Closed-Pilot-Cron-Whitelist | `9e43189` | 503-Block für `/api/cron/*` entfernt — **Outage-Killer** |
| 3 | Test-Sync-Fix (Duplikat) | `fea4e62` | unblocked deploy nach Map-Drift |
| 4 | Handoff-Doc cron-outage-fix | `e395e52` | Dokumentation |
| 5 | Founder-Bypass-Risk-Scorer | `ff88106` | Self-Lockout-Fix via Cookie-User-ID |
| 6 | News-Boilerplate-Filter | `4051e3a` | `Seitenbereiche` & Navigation-Schrott blockiert |
| 7 | Quartier-Info-Schema-Fix | `88f7c52` | `lat/lon/active` → `center_lat/center_lng/status` |
| 8 | Pollen-Region 112→113 | `45bd0df` | Bad Saeckingen liegt im Schwarzwald, nicht Hohenlohe |

### Codex-Wellen (Abend-Schicht)

| # | Commit | Was |
|---|---|---|
| 9 | `60ae46e` | QA-Bericht zu Wellen 1-8 |
| 10 | `073985e` | Handoff nach QA |
| 11 | `7f192a7` | fix(info-hub): Pollen-Cache-Drift refresh |
| 12 | `bdd5514` | Handoff nach Pollen-Smoke |
| 13 | `a22c515` | **fix: `assertCacheWriteSucceeded`** — silent fails sichtbar |
| 14 | `fb5fae5` | **Migration 191** file: `oepnv` als Cache-Source |
| 15 | `1dea8e7` | Handoff Cache-Persistenz |

### Daten-/Config-Fixes (kein Code)

- **Pilot-Member-Insert**: Founder Thomas (`dbd5e23e-...`) als role=owner in `household_members` für Founder-Household `62ab2b52-...` (Purkersdorfer 35) — vorher fehlte der Eintrag, daher keine Quartier-Sicht
- **Issue 0015 Amtsblatt verifiziert**: 70/70 Announcements (bereits 2026-05-10 15:09 UTC reprocessed, vor Session-Start)
- **News-Schrott-Item gelöscht**: id `4f06f04c-...` "Seitenbereiche"
- **Manueller Cron-Trigger** via tsx-Skript: 105 Müllabfuhr-Termine + Wetter/Pollen-Cache-Init
- **Feature-Flag `CHECKIN_MESSAGES_ENABLED`**: `false` → `true` (Care-Checkin "nicht gut" funktioniert)
- **Vercel Firewall System-Bypass**: Founder-IP `93.200.153.4` hinzugefügt
- **Migration 191 apply auf Prod-DB**: `weather,pollen,nina,oepnv`-Constraint

### Memory-Korrekturen

- `project_pilot_quartier_id.md`: **Quartier-ID** ist `ee6cfcab-f615-47cd-afe7-808a27cb584b` (NICHT `62ab2b52-...` — das ist Household-ID Purkersdorfer 35)
- Neue Files: `feedback_closed_pilot_whitelist_pflege.md`, `project_pilot_quartier_id.md`
- MEMORY.md Stand-Pointer auf Pass 29 final aktualisiert

## 3 strukturelle Bugs gefunden + gefixt

1. **Closed-Pilot-503-Block für alle Crons** — `lib/supabase/middleware.ts:165-179` blockierte jede API-Route ohne Supabase-User. Vercel-Crons haben keinen User → 503. Whitelist hatte nur 4 Pfade. Pattern-Match `/api/cron/*` + `/api/care/cron/*` lös das.
2. **Silent-Fail bei Cache-Writes** — `runQuartierInfoSync()` prüfte `{error}` nicht. Supabase wirft nicht bei RLS/Constraint-Fail → falsche `weather=1`-Reports trotz leerer DB. `assertCacheWriteSucceeded()` macht's sichtbar.
3. **OEPNV-Constraint-Bug seit Init** — Mig 118-Constraint erlaubte nur `weather,pollen,nina`, Code schreibt `oepnv`. Mig 191 erweitert die Liste.

## Verifikation kommt durch heutige Cron-Schedules

- **02:00 UTC**: `waste_sync` (Müll-Termine refresh)
- **06:00 UTC**: `quartier_info_sync` (Wetter, Pollen-Region 113, OEPNV — jetzt nicht mehr silent fail)
- **07:00 UTC**: `nina_sync`, `event_reminders`

Wenn morgen Heartbeats für all diese frische Timestamps haben + Cache-Tabelle voll ist → Pass 29 ist final verifiziert.

## 4 offene Punkte für nächste Session

### 1. 0 Events im Pilot — Founder anlegen
- `events`-Tabelle hat 0 Rows für Pilot-Quartier `ee6cfcab-...`
- Kein Sync-Bug, leere Quelle
- Founder muss Test-Events über Admin-UI anlegen, oder ich kann via SQL einfügen wenn next Session sagt go
- Alternativ: Welle zum Anlegen von Demo-Events für UI-Pilot

### 2. Bug-Report-Button fehlt auf bestimmten Pages
- Founder hat keine konkrete Page benannt
- Nächste Session: Founder fragt "fehlt auf Page X" → diagnose Layout-Pfad
- `BugReportButton` ist in `app/(app)/layout.tsx` — Senior- und Active-Mode
- Pages in anderen Route-Groups (`(auth)`, `(senior-app)`, `(kiosk)`, `(admin)`) haben separates Layout

### 3. Voice/KI-Verifikation im Live-Browser
- Founder-Bypass löst 403er → API-Calls funktionieren
- Aber: tatsächliche Voice-Pipeline (TTS/STT, Anthropic-API für Companion) muss im UI getestet werden
- Founder soll im eigenen Browser mit Hard-Refresh (Strg+F5):
  - `/companion` (KI-Assistent) testen
  - Voice-Assistant-FAB (Mikrofon-Knopf) testen
- Wenn was nicht geht → Console-Errors für Diagnose

### 4. Verwaiste Untracked-Files
- `.codex-welle-d-3001.pid` im Repo-Root — vermutlich tot
- ~14 Codex-/Claude-Handoff-Files in `docs/plans/handoff/` aus dem 2026-05-03 bis 2026-05-09 — pflegen/archivieren
- Pre-Welle-Scripts: `scripts/manual-cron-trigger-2026-05-10.ts` + `scripts/reprocess-amtsblatt-issue-0015.ts` — sind nicht committed, weiter unberührt lassen oder gezielt committen

## Sofort-Diagnose-Pfade für nächste Session

```bash
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"

# Verifikation: Heartbeats nach heutigem Cron-Run
# SQL via Supabase MCP:
# SELECT job_id, last_run_at, metadata FROM cron_heartbeats
# WHERE last_run_at > '2026-05-11' ORDER BY last_run_at DESC;

# Verifikation: Cache hat jetzt Daten
# SQL: SELECT source, count(*), max(fetched_at) FROM quartier_info_cache GROUP BY source;

# Falls Cache leer obwohl Cron lief: Logs holen
vercel logs https://nachbar-io.vercel.app

# Voice/KI im Browser
# https://nachbar-io.vercel.app/companion
```

## Variante A bestätigt + erweitert

- Code-Welle + Push + Deploy autonom durch (15× heute)
- **Migration 191 apply auf Prod-DB** — Founder-Go `b` gegeben (Variante A: "Mig-Apply auf Prod" ist Founder-Hand, Founder hat go gegeben durch "B go")
- Vercel-Env, Provider, Geld weiterhin Founder-Hand

## HEAD-Stände

- master: `1dea8e7`
- origin/master: `1dea8e7`
- production deploy: `25652199987` → `1dea8e7` live
- Migration HEAD: 191 applied
- Auto-Memory: Pass 29 final
