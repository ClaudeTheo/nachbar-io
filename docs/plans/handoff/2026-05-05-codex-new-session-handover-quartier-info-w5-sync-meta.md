# New Session Handover: Quartier-Info nach W0/W1, naechster Schritt W5 sync_meta

Datum: 2026-05-05
Autor: Codex
Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`

## Aktueller Git-Stand

Aktueller lokaler HEAD:

```text
799d899 feat(quartier-info): add osm pharmacy sync
```

Wichtige lokale Commits seit Production-HEAD/OWASP-Stand:

- `4c26089 fix(quartier-info): show api error state`
- `822b18b docs(quartier-info): record scaling feedback and w0 check`
- `799d899 feat(quartier-info): add osm pharmacy sync`

Weitere bereits vorhandene lokale Commits davor:

- `0b9452e fix(config): allow blob workers in csp`
- `ce9fe9b docs(db): record prod migration 176 177 apply`
- `bd09938 docs(handoff): ask claude next migration step`
- `0767d08 docs(db): add migration 176 177 runbook`
- `2c8d2a7 docs(db): record prod migration 186 187 apply`
- `59db13c docs(handoff): record live owasp migration go`

**Nicht pushen ohne separaten Founder-Go.**

## Was zuletzt gemacht wurde

### 1. Quartier-Info W0 Prod Read-only Check

Datei:

- `docs/plans/2026-05-04-quartier-info-w0-prod-readonly-check.md`

Befund:

- Production-Daten fuer Bad Saeckingen sind nicht leer.
- Beide relevanten Bad-Saeckingen-Quartiere sind `active`.
- Beide haben `municipal_config` mit:
  - 3 Apotheken
  - 2 Events
  - 9 Service-Links
  - Notdienst-URL
  - Event-Kalender-URL
- Migration `130_municipal_config_dynamic_data` ist in Prod applied.
- Unauthentifizierter Live-API-Call auf `/api/quartier-info?quarter_id=...` liefert `503 closed_pilot`.

Interpretation:

- Der beobachtete Empty State ist kein fehlender Seed.
- Wahrscheinlicher war API-Fehler/Closed-Pilot/fehlender `currentQuarter`, der im Client wie leere Daten behandelt wurde.

### 2. Empty-State-Fix

Commit:

```text
4c26089 fix(quartier-info): show api error state
```

Files:

- `app/(app)/quartier-info/page.tsx`
- `__tests__/pages/quartier-info-vorlesen.test.tsx`

Aenderung:

- `fetch('/api/quartier-info?...')` prueft jetzt `res.ok`.
- `503 closed_pilot` / `403 pilot_approval_pending` wird als Fehlerkarte gezeigt.
- Fehler-JSON wird nicht mehr als leere Quartierdaten interpretiert.
- TTS/Vorlesen rendert bei API-Fehler nicht mehr.

Verifiziert:

- RED-Test fiel zuerst korrekt.
- `npx vitest run __tests__/pages/quartier-info-vorlesen.test.tsx`
- gezieltes ESLint
- `npx tsc --noEmit`

### 3. Quartier-Info Skalierung Zweitmeinung

Datei:

- `docs/plans/handoff/2026-05-04-codex-an-claude-quartier-info-skalierung-feedback.md`

Kurzempfehlung:

- Variante B skalierbare Pipeline ist richtig.
- Aber W0 vor W1 war noetig.
- Fuer Mig 188 eher `sync_meta JSONB DEFAULT '{}'` statt drei separater JSONB-Spalten.
- Notdienst-Apotheken weiter defer'en, bis API/Terms/Haftung klar sind.

### 4. W1 OSM-Apotheken-Sync lokal

Commit:

```text
799d899 feat(quartier-info): add osm pharmacy sync
```

Files:

- `modules/info-hub/services/osm-poi-sync.service.ts`
- `app/api/cron/osm-poi-sync/route.ts`
- `__tests__/modules/info-hub/osm-pharmacy-sync.test.ts`
- `app/api/cron/osm-poi-sync/route.test.ts`
- `docs/plans/2026-05-04-osm-pharmacy-sync-w1.md`
- `docs/plans/handoff/INBOX.md`

Inhalt:

- Overpass-Query fuer `amenity=pharmacy` und `healthcare=pharmacy`.
- Parser fuer Nodes/Ways/Relations mit Tags, Center-Koordinaten, Adresse, Telefon, Oeffnungszeiten.
- Auto-Daten bekommen `source: "osm-overpass"`, `osmId`, `lat`, `lng`, `syncedAt`.
- Merge-Regel:
  - manuelle Apotheken bleiben unveraendert,
  - alte OSM-Auto-Eintraege werden ersetzt,
  - OSM-Eintraege mit gleichem Namen wie manuelle Eintraege werden nicht druebergelegt.
- Neue Cron-Route `/api/cron/osm-poi-sync` ist mit `CRON_SECRET` geschuetzt.
- Wichtig: **kein `vercel.json`-Schedule**. Also lokal vorhanden, aber nicht automatisch aktiv.

Verifiziert:

```powershell
npx vitest run __tests__/modules/info-hub/osm-pharmacy-sync.test.ts app/api/cron/osm-poi-sync/route.test.ts __tests__/pages/quartier-info-vorlesen.test.tsx
npx eslint "modules/info-hub/services/osm-poi-sync.service.ts" "__tests__/modules/info-hub/osm-pharmacy-sync.test.ts" "app/api/cron/osm-poi-sync/route.ts" "app/api/cron/osm-poi-sync/route.test.ts"
npx tsc --noEmit
```

Ergebnis:

- Vitest: 3 Files, 14 Tests passed
- ESLint: gruen
- TypeScript: gruen

## Aktueller Working Tree

Zum Zeitpunkt dieser Uebergabe gab es weiterhin alte untracked Dateien, die nicht zu dieser Welle gehoeren, z.B.:

- `.codex-welle-d-3001.pid`
- `docs/plans/2026-05-04-quartier-info-skalierung-auto-first.md`
- mehrere alte `docs/plans/handoff/2026-05-03-*` und `2026-05-04-*` Claude/Codex-Handoffs

Diese nicht pauschal loeschen oder committen. Nur anfassen, wenn der Founder es explizit will.

## Rote Grenzen

Weiterhin strikt:

- Kein Push ohne separaten Founder-Go.
- Keine Prod-DB-Schreibaktion ohne separaten Founder-Go.
- Keine Migration auf Prod ohne separaten Founder-Go.
- Keine Vercel-Env-Aenderung.
- Keine Secrets lesen oder ausgeben.
- Mig 178 weiter defer'en.
- W1 Cron nicht schedulen/deployen ohne separates Go.
- Notdienst-Apotheken nicht importieren, nur Link/URL nutzen, bis API/Terms/Haftung klar sind.

## Empfohlener naechster Schritt

**W5 klein vorziehen: `sync_meta` lokal vorbereiten.**

Warum:

- W1 schreibt schon Daten nach `municipal_config.apotheken`.
- Bevor dieser Sync irgendwann aktiviert wird, sollte pro Quelle nachvollziehbar sein:
  - letzter Sync-Zeitpunkt,
  - Quelle,
  - Status,
  - Anzahl gefundener/geschriebener Eintraege,
  - Fehler,
  - ob manuelle Overrides erhalten wurden.
- Das passt zur Zweitmeinung: lieber ein einzelnes `sync_meta JSONB DEFAULT '{}'` statt drei separater JSONB-Felder (`auto_sync_status`, `last_synced_at`, `data_source`).

Konkrete W5-Umsetzung lokal:

1. Pre-Check:
   - `rg -n "sync_meta|auto_sync_status|last_synced_at|data_source|municipal_config" supabase/migrations lib modules app __tests__`
   - sicherstellen, dass Migration 188 noch frei ist bzw. naechste Nummer pruefen.
2. TDD:
   - Test fuer Migration/Schema-Intent analog vorhandener Config-/Migrationstests, falls Muster vorhanden.
   - Test in `__tests__/modules/info-hub/osm-pharmacy-sync.test.ts`, dass `runOsmPoiSync()` `sync_meta.apotheken` schreibt.
3. Migration lokal:
   - `supabase/migrations/188_municipal_config_sync_meta.sql`
   - `ALTER TABLE public.municipal_config ADD COLUMN IF NOT EXISTS sync_meta JSONB NOT NULL DEFAULT '{}'::jsonb;`
   - Kommentar auf Spalte.
4. Types:
   - `lib/supabase/database.types.ts` lokal passend ergaenzen, wenn keine Supabase-Typegen genutzt wird.
5. Service:
   - `modules/info-hub/services/osm-poi-sync.service.ts` beim Update `sync_meta.apotheken` setzen:
     - `status: "ok" | "error"`
     - `source: "osm-overpass"`
     - `last_synced_at`
     - `found_count`
     - `written_count`
     - `manual_preserved_count`
     - `error`
   - Beim einzelnen Quartier-Fehler moeglichst Fehlerstatus schreiben, falls `municipal_config` vorhanden ist.
6. Doku:
   - Plan-Datei `docs/plans/2026-05-05-municipal-config-sync-meta-w5.md`
   - INBOX-Zeile.
7. Verifikation:
   - gezielte Vitest
   - gezieltes ESLint
   - `npx tsc --noEmit`
8. Lokal committen, kein Push.

## Optional danach

Nach W5:

- W3 Rathaus-Defaults lokal.
- W2 Events-Crawler lokal.
- Oder erst UI/Auth-Smoke der Quartier-Info mit einem freigegebenen Test-/Founder-Konto.

Wichtig: W1 ist lokal gebaut, aber ohne Schedule. Fuer echte Aktivierung braucht es spaeter separaten Founder-Go fuer Deploy/Schedule und ggf. Prod-Migration 188.
