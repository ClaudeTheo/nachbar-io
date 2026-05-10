# Brief: Claude → Claude (neue Session) — Grosse Welle 2026-05-10

**Datum:** 2026-05-10 (gleicher Tag wie der Pilot-Reset, gleiche Session)
**Owner:** claude
**Sessions-Token:** ~75-80% verbraucht — Handover sinnvoll

## Aktueller Live-Stand

- **master HEAD:** `e6eacef`
- **origin/master:** `e6eacef` (synced)
- **Live (Vercel):** `e6eacef` (alle 12 Deploys gruen)
- **Tests:** 4380+ gruen, +85 neue TDD-Tests in dieser Session
- **tsc + eslint clean**

## Was diese Session geliefert hat (13 Commits in Reihenfolge)

| # | Commit | Was |
|---|---|---|
| 1 | `7b8bd51` | feat: W11 OEPNV-Stops Admin-UI |
| 2 | `5b72f52` | fix: TtsPlayback CI-Drift Node 20 jsdom Blob → String-Body |
| 3 | `e56dc71` | fix: external-warning-banner Timezone deterministic Europe/Berlin |
| 4 | `5ed7bdc` | feat: W10 Event-Feed-Crawler (RSS+iCal) |
| 5 | `539ca0d` | feat: W4-Mini Onboarding-Pipeline |
| 6 | `21fe6a5` | chore: Timezone-Hardening 4 weitere toLocaleString-Sites |
| 7 | `a6826c0` | feat: W4-FULL OnboardingManager UI |
| 8 | `a45bba8` | chore: npm audit fix (3 von 5 Vulnerabilities) |
| 9 | `18c66b9` | chore: CI bump actions @v6 + Node 22 |
| 10 | `4c8b676` | feat: W10-Persist (Mig 190 + Apply-Service + UI-Button) |
| 11 | `d92c3c8` | feat: Auto-Domain-Discovery (lib/cities/domain-resolver) |
| 12 | `9e4a0a9` | fix: Amtsblatt-Pipeline robust-parse + reprocess-Endpoint |
| 13 | `e6eacef` | feat: AmtsblattReprocess UI |

## Aktueller Stand der Pipelines

### Amtsblatt-Pipeline (Welle K2 — heute repariert)

Tabellen `amtsblatt_issues` (Source) + `municipal_announcements` (Output) Mig 098+105.

```
Issue 0017 (2026-04-25)  status=done  extracted=19  announcements=19  ✅ recovered
Issue 0015 (2026-04-11)  status=done  extracted=80  announcements=0   ⚠️ Founder noch nicht reprocessed
Issue 0013 (2026-04-04)  status=done  extracted=37  announcements=37  ✅ recovered
```

**56 Bad-Saeckingen-Meldungen jetzt live** (z.B. "Hauptversammlung Freundeskreis Purkersdorf" — Pilot-Quartier-Bezug bestaetigt).

**Bugs gefixt:**
- `recoverItemsFromTruncated()` in `lib/municipal/amtsblatt.ts` — Brace-Counter rettet komplette Items aus truncated KI-Antworten
- `max_tokens` 16000 → 32000 in `runAmtsblattSync` und `reprocessAmtsblattIssue`
- Neue Funktion `reprocessAmtsblattIssue(supabase, issueId)` + Endpoint POST `/api/admin/amtsblatt/reprocess`
- UI `AmtsblattReprocess.tsx` im Admin-Dashboard "Amtsblatt-Pipeline"-Tab

**Cron-Schedule:** Samstag 08:00 UTC via `vercel.json`. Naechster Lauf: 2026-05-16 08:00 UTC.

### Onboarding-Pipeline (Welle W4-FULL + Auto-Domain)

POST `/api/admin/quarters/[id]/onboard`:
1. Welle: `resolveCityDomain(quarter.city)` — Heuristik ohne LLM (`www.{compact}.de` → `www.{dashed}.de` → ...)
2. Welle J: `probeFeedUrls(domain)` — RSS/iCal-Pfad-Probe
3. Welle H: `discoverOepnvStopsForQuarter` — EFA-BW Stop-Vorschlaege
4. Welle W10: `crawlEventFeeds(rssUrl, icalUrl)` — Event-Pull

UI: Admin-Dashboard "Onboarding-Pipeline"-Tab. Ergebnisse: Domain-Card + Feeds + Stops + Events + Errors. **"Stops uebernehmen"** + **"Events uebernehmen"** rufen die Apply-Endpoints (Welle I, Welle W10-Persist).

Pilot-Test: "Bad Säckingen" → `https://www.badsaeckingen.de` automatisch (200 OK). Aber: wahrscheinlich keine RSS/iCal-Feeds dort, daher 0 Events vom Onboarding-Run. Echte Events kommen via Amtsblatt-Pipeline (siehe oben).

### W10-Persist (Migration 190 file-only)

`supabase/migrations/190_municipal_config_crawled_events.sql` — ADD COLUMN `crawled_events JSONB` + `crawled_events_synced_at TIMESTAMPTZ`. **Nicht applied auf Prod** (Founder-Hand). Service `applyCrawledEventsForQuarter` + Endpoint `/api/admin/quarters/[id]/events/apply` wartet darauf.

Solange Mig nicht applied: "Events uebernehmen" Button im OnboardingManager wirft Server-Error (Spalte existiert nicht). Das ist erwartet, kein Bug.

## Was offen ist

### Founder-Hand
- **Reprocess Issue 0015 im Browser** — fehlt nur ein Klick um die 80 Items vom Pilot-Reset wiederherzustellen → ~136 Announcements live
- **Mig 190 Apply auf Prod** — wenn W10-Crawl-Persist genutzt werden soll
- **Mig 189 Apply auf Prod** (Strassen-Trim) — schon laenger offen
- GmbH-Kette (FYRST → BestSign → Bank → HR)
- Pilot-Akquise (5-10 Familien Bad Saeckingen, Carmen Schlachter zuerst)

### Code-Optionen (autonom, Variante A)
- **Welle K1 — HTML-Event-Parser** (~2-3h): JSON-LD/Microdata/HTML-Tabellen parsen. Loest "Stadt hat HTML-Kalender, kein Feed"-Faelle (z.B. badsaeckingen.de Veranstaltungskalender).
- **Welle K3 — Quartier-Source-Registry** (~4-6h, NACH 2 Pilot-Staedten): Generalisierung des Waste-Source-Pattern auf Events/Vereine.
- **News-RSS-Service Test-Coverage anlegen** (~1h): bisher keine Tests, blockt sicheren Refactor.
- **Frontend-Anzeige fuer `municipal_announcements`** im Quartier-Info-Hub: 56 Items sind in DB, aber wo werden sie angezeigt? Pruefen.
- **Senioren-relevante Kategorien priorisieren** in der Anzeige: `verein`, `soziales`, `veranstaltung` zuerst.

### LLM-Fallback fuer Domain-Resolver
Heuristik schlaegt fehl bei Edge-Cases ("Frankfurt am Main" → frankfurt.de). Mit Claude Haiku als Fallback nach Heuristik loesbar (~10 Cent pro 100 Lookups).

## Wichtige Memory-Eintraege dieser Session

- `pattern/welle-w10-w4-mini-fertig-event-crawler-onboarding-pipeline`
- `pattern/welle-w4-full-ui-onboardingmanager-timezone-hardening`
- `pattern/welle-w10-persist-workflow-update-node-22-npm-audit-fix`
- `pattern/skalierbare-stadt-domain-auto-discovery-heuristik-kein-llm`
- `bug/amtsblatt-pipeline-lebt-bug-fix-reprocess-ui`
- `bug/ci-drift-usettsplayback-node-20-jsdom-blob-response`
- `bug/ci-drift-timezone-bug-tolocalestring-without-timezone`

## Was die naechste Session sofort tun sollte

1. `git status --short --branch` — bestaetigen master==origin==`e6eacef`
2. Diese Datei lesen
3. Auto-Memory `MEMORY.md` lesen, dann engram-Suche ueber `mem_context` fuer letzte Session-Patterns
4. Auf Founder-Wunsch warten — Optionen oben

**Quick-Check ob Pipeline weiter lebt** (kein Code noetig, nur SQL):
```sql
SELECT issue_number, status, extracted_count,
       (SELECT count(*) FROM municipal_announcements ma WHERE ma.amtsblatt_issue_id = ai.id) AS ann_count
FROM amtsblatt_issues ai
ORDER BY issue_date DESC LIMIT 5;
```

## Rote Zone bei naechster Session

Wie immer (Variante A):
- Push autonom mit TDD gruen erlaubt
- Vercel-Env: NEIN
- Mig-Apply auf Prod: NEIN ohne Go (190 + 189 warten)
- Provider/Geld: NEIN
- Reprocess-Endpoint-Aufrufe gegen Prod: low-cost (~5 Cent), aber Founder-Wahl
