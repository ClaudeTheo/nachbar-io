# Brief: Claude → Claude (naechste Session) — Pilot-Reset komplett

**Datum:** 2026-05-10 nacht (nach Welle G+H+I+J + Pilot-Reset komplett)
**Owner:** claude
**Codex-Bestaetigung:** Liegt vor unter `docs/plans/handoff/2026-05-10-codex-an-claude-bestaetigung-pilot-reset.md` (untracked, von Codex Read-only verifiziert: alle Soll==Ist, keine Abweichung).

## Stand

**master** (nachbar-io): `fffeab0`. **origin/master**: `b7463a9`. **Live (Vercel)**: `1e3eb08`.

13 Commits ahead von Live. 1 Commit lokal nicht gepusht (`fffeab0` Nachtrag 2).

```
fffeab0 docs(cleanup): Pilot-Reset-Nachtrag 2 — Quartiere/Households auf Founder    [LOKAL, nicht gepusht]
b7463a9 docs(handoff): claude-an-codex Bestaetigungsauftrag fuer Pilot-Reset        [origin head]
a2e8745 docs(cleanup): UGC-Reset-Nachtrag fuer Pilot-Vorbereitung
70fa5e2 docs(cleanup): Pilot-Reset Prod-User-DELETE — 1183->1, Founder erhalten
a8ee62e feat(admin): pilot-reset users cleanup helper (Founder-Allowlist)
b6830c1 docs(handoff): claude-to-claude handover after Wave H+I+J
5fb2fb5 feat(events): probe city domains for RSS/iCal event feeds (Wave J)
08bc61f feat(oepnv): admin endpoint to apply selected OEPNV stops (Wave I)
8eb2afa feat(oepnv): EFA-BW stop-finder + admin discovery endpoint (Wave H)
cc009aa docs(handoff): claude-to-claude handover after Welle G
dab4632 feat(test-helpers): enforce is_test_user=true via central factory (Wave G)
857582b docs(handoff): claude-to-claude handover after Welle E + F
094830a feat(cleanup): add test-households dry-run + street-trim migration 189
698b1ce feat(cleanup): extend ai-test users dry-run with synthetic patterns + allowlist
```

## Prod-DB (komplett bereinigt — verifiziert read-only)

| Tabelle | Wert |
|---|---|
| `users` / `auth.users` | **1** (Founder Thomas Theobald, `dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd`, `thomasth@gmx.de`) |
| `quarters` | **1** (`bad-saeckingen-pilot` – Purkersdorfer/Sanary/Rebberg) |
| `municipal_config` | **1** (Bad Saeckingen) |
| `households` | **1** (`Purkersdorfer Strasse 35`, `62ab2b52-...`, invite_code `PILOT-MZPD-DZCS`) |
| `map_houses` | **98** (Pilot-Quartier-Karten-Adressen) |
| `news_items` | **13** (Pilot-Quartier Auto-Sync) |
| `feature_flags` | **50** (App-Konfig) |
| `external_warning_sync_log` | 3633 (Cron-Sync-Historie, behalten) |
| `waste_collection_dates` | 133 (Cron-Sync) |
| Alle UGC-Tabellen (~140 Stueck) | **0** |

`care_audit_log` Trigger `tgenabled = O` (aktiv).

## Was im Code vorbereitet ist (alles getestet + gepusht außer fffeab0)

### Welle G — Test-Helper-Pflicht
- `tests/e2e/helpers/test-user-factory.ts` (Pflicht-`is_test_user=true`)
- `__tests__/_helpers/test-user-builder.ts` (Vitest-Mock)
- 5 Konsumenten umgestellt: db-seeder, s11-memory.spec, create-test-users.ts, seed-demo-quarter.ts, ai-test-runner.mjs

### Welle H — EFA-BW Stop-Finder
- `lib/oepnv/efa-bw-stop-finder.ts` (Parser + fetch-Wrapper)
- `modules/info-hub/services/oepnv-stops-discovery.service.ts` (top-N Stops fuer Quartier-Center)
- `app/api/admin/quarters/[id]/oepnv-stops/discover/route.ts` (super_admin GET)

### Welle I — OEPNV Stops Apply
- `modules/info-hub/services/oepnv-stops-apply.service.ts` (Validierung + Trim + Dedupe + max 25)
- `app/api/admin/quarters/[id]/oepnv-stops/route.ts` (super_admin POST)

### Welle J — Feed-URL-Prober
- `lib/events/feed-url-prober.ts` (RSS/iCal-Standardpfade-Probe)

### Pilot-Reset-Helper (Audit-Trail)
- `lib/admin/pilot-reset-users-cleanup.ts` (allowlist case-insensitive, Bestaetigungs-Token)
- `__tests__/admin/pilot-reset-users-cleanup.test.ts` (11 Tests)

**Test-Counts gesamt heute:** 60 neue TDD-Tests (Welle G+H+I+J: 17+23+13+10) + 11 (Pilot-Reset) = **71 Tests gruen**. tsc + eslint clean.

## Was offen ist

### Founder-Hand
- **Push-Go fuer `fffeab0`** (Nachtrag 2 ist lokal-only).
- **Live-Deploy:** 13 Commits hinter Live. `gh workflow run deploy.yml` triggert Build+Deploy. Niedriges Risiko, aber Founder muss Go geben (workflow_dispatch only).
- Mig 189 Apply gegen Prod (Strassen-Trim) — bisher nicht angewendet.
- GmbH-Kette (FYRST-3-Briefe → BestSign → Bank → HR-Eintragung).
- Pilot-Akquise (5-10 Familien Bad Saeckingen, Carmen Schlachter zuerst).

### Code-Welle-Optionen (autonom moeglich)
- **W11 Admin-UI fuer OEPNV-Stops:** Page `/admin/quartiere/[id]/oepnv-stops` mit Vorschau (Discover-Endpoint) + Checkboxen + Speichern (Apply-Endpoint). ~2-3h. UI → Browser-Verifikation noetig.
- **W10 Externer Feed-Crawler-Service:** nutzt Welle-J-Prober, parst RSS/iCal mit `fast-xml-parser` (im Stack), schreibt Events in `municipal_config.events`. ~4-6h.
- **W4 Onboarding-Pipeline:** verbindet Welle H/I/J/W3 in `/api/admin/quartiere/onboard`-Endpoint, sodass eine neue Stadt in 30 Min onboarded werden kann. ~6-8h.

## Founder-Adresse (durable)

`Purkersdorfer Strasse 35, 79713 Bad Saeckingen`. household-ID `62ab2b52-26c0-4915-8c69-f04162e9348a`, invite_code `PILOT-MZPD-DZCS`. In Memory `user_identity.md` festgehalten.

## Memory-Updates dieser Session

- `feedback_token_threshold_60_prozent.md` — bis 60% Token durcharbeiten in groesseren Schritten.
- `project_nachbar_io_zero_real_users.md` — bis Pilotstart 0 echte Nutzer; UGC ist loeschbar.
- `user_identity.md` — Founder-Adresse + household-ID.
- `project_db_test_users_cleanup_gap.md` — auf GELOEST gesetzt.
- engram-Pattern: Welle G, Welle H+I+J.

## Rote Zone bei naechster Session

- Push autonom: erst nach Founder-Go (Nachtrag 2 wartet).
- Vercel-Env: NEIN.
- Mig-Apply auf Prod: NEIN ohne Go.
- Provider/Geld: NEIN.
- Echte DB-Schreibungen: NUR mit explizitem Founder-Go pro Aktion.
- Code-Push: Variante A erlaubt autonom mit TDD gruen, aber **die zwei naechsten naheliegenden Pushes (Nachtrag 2 + Live-Deploy) brauchen Founder-Wort** weil sie Live-State beruehren.

## Was die naechste Session sofort tun sollte

1. `git status --short --branch` — bestaetigen master==origin oder ein Commit ahead.
2. `docs/plans/handoff/2026-05-10-claude-an-claude-pilot-reset-final-stand.md` (diese Datei) lesen.
3. Auto-Memory `MEMORY.md` lesen, dann Sektion "Status-Pointer" + neue Memory-Eintraege.
4. Auf Founder warten, was er als naechstes will. Optionen oben.
