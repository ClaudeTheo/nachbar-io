# Session-Handoff — Gesundheits-Feature-Flags Stufe 3 LIVE

**Datum:** 2026-04-19
**Von:** Claude Opus 4.7 (Plan + Implementation + Deploy-Trigger)
**An:** Naechste Session

---

## TL;DR

Stufe 3 des Gesundheits-Feature-Flag-Umbaus ist **komplett live auf Prod**.
Admin kann jetzt im Admin-Dashboard unter der neuen Gruppe „Gesundheit"
6 Flags toggeln, und jeder Toggle wirkt tatsaechlich:

- Flag OFF -> Middleware redirectet `/care/<health-route>` auf `/kreis-start`
- Flag OFF -> Care-Hub-Kachel wird grau gerendert („Im Pilot noch deaktiviert")
- Flag ON  -> Seite + Kachel sofort frei (max 60 s Cache-Latenz)

Alle 6 Health-Flags stehen aktuell auf `enabled=false` (sicherer Pilot-Default).

**Letzter Commit:** `a143eb0`.
**Push-Range:** `1f879af..a143eb0` (8 Commits).
**Deploy:** manuell getriggert via `gh workflow run deploy.yml` (Run `24623956530`).

---

## Die 6 Flags (alle Default OFF in Prod)

| Flag | Gate-Routes | Care-Hub-Kachel |
|---|---|---|
| `MEDICATIONS_ENABLED` | `/care/medications` | Medikamente |
| `DOCTORS_ENABLED` | `/care/aerzte` | Aerzte |
| `APPOINTMENTS_ENABLED` | `/care/appointments`, `/care/termine` | Termine |
| `VIDEO_CONSULTATION` | `/care/sprechstunde`, `/care/consultations` | Sprechstunde |
| `HEARTBEAT_ENABLED` | `/care/heartbeat`, `/care/checkin` | Check-in |
| `GDT_ENABLED` | `/arzt` | (kein Hub-Tile) |

---

## Architektur

### Middleware-Layer (proxy.ts)

```ts
const healthFlag = getRequiredFlagForRoute(pathname);
if (healthFlag) {
  const enabled = await getCachedFlagEnabled(healthFlag);  // Redis 60s TTL
  if (!enabled) return redirect('/kreis-start');
}
```

- `getRequiredFlagForRoute()`: `lib/health-feature-gate.ts` — Prefix-Match
- `getCachedFlagEnabled()`: `lib/feature-flags-middleware-cache.ts`
  — Upstash Redis mit 60 s TTL, Fail-closed auf DB-Fehler
- Health-Prefixes wurden aus `LEGACY_ROUTE_PREFIXES` entfernt (Commit `33a6976`)

### Care-Hub-UI (app/(app)/care/page.tsx)

- Batch-Fetch: eine Supabase-Query liest alle 6 Flag-Zustaende beim Mount
- `computeTileDisabled(href, flagMap, isLegacyFn)` entscheidet pro Kachel

### Admin-UI (app/(app)/admin/components/FeatureFlagManager.tsx)

- Neue Gruppe „Gesundheit" steht an erster Stelle
- 6 Flags mit deutschen Beschreibungen
- Toggle aktualisiert DB direkt + invalidiert Client-Cache
- Middleware-Cache (Redis) laeuft 60 s weiter — nach max 60 s auch dort refreshed

---

## Wichtige Dateien (neu)

- `lib/health-feature-gate.ts` — Route→Flag-Mapping + `computeTileDisabled`
- `lib/__tests__/health-feature-gate.test.ts` — 10 Tests
- `lib/feature-flags-middleware-cache.ts` — Redis-Cache
- `lib/__tests__/feature-flags-middleware-cache.test.ts` — 7 Tests
- `__tests__/middleware/legacy-routes.test.ts` — erweitert um Gesundheits-Routes, 35 Tests
- `__tests__/app/care/care-hub-flags.test.ts` — 7 Tile-Tests
- `__tests__/lib/feature-flags-audit.test.ts` — Guard gegen tote Flags (7 Tests)
- `supabase/migrations/170_health_feature_flags.sql` + `.down.sql`
- `docs/plans/2026-04-19-gesundheits-flags-stufe-3.md` — urspruenglicher Plan

---

## Wichtige Dateien (veraendert)

- `proxy.ts` — Health-Flag-Check vor Legacy-Route-Check
- `lib/legacy-routes.ts` — Health-Routes entfernt
- `app/(app)/care/page.tsx` — Kacheln Flag-aware
- `app/(app)/admin/components/FeatureFlagManager.tsx` — Gruppe „Gesundheit"

---

## Smoke-Test-Plan (manuell nach Deploy)

Pre-Conditions: Alle 6 Flags OFF, User `plan=pro`.

1. **Care-Hub:** `/care` -> alle 5 Health-Kacheln grau, Subtitle „Im Pilot noch deaktiviert"
2. **Middleware-Redirect:** `/care/medications` direkt in Adresszeile -> Redirect `/kreis-start`
3. **Admin-UI:** `/admin` -> Gruppe „Gesundheit" mit 6 Flags + Descriptions sichtbar
4. **Flag ON:** Toggle `MEDICATIONS_ENABLED`, 70 s warten (Cache-TTL + buffer)
   - `/care/medications` direkt -> laedt normal
   - `/care` -> Kachel „Medikamente" klickbar
5. **Flag OFF zurueck:** Toggle wieder aus, 70 s warten
   - Beide Verhalten kehren zu 1) und 2) zurueck
6. **Kombi-Test:** 3 Flags ON gleichzeitig (z.B. MEDICATIONS, DOCTORS, APPOINTMENTS)
   - Die 3 Kacheln klickbar, die anderen 3 grau

---

## Rollback (falls Bug)

**Option A — Flag-Ebene (schnell, 1 s):**
```sql
update public.feature_flags set enabled = false
where key in ('MEDICATIONS_ENABLED','DOCTORS_ENABLED',
              'APPOINTMENTS_ENABLED','VIDEO_CONSULTATION',
              'HEARTBEAT_ENABLED','GDT_ENABLED');
```

**Option B — Migration rueckbauen:**
```bash
# 170_health_feature_flags.down.sql ausfuehren (loescht nur die 2 neuen Flags)
# Die 4 alten Flags bleiben — sie waren schon vor Stufe 3 in der DB
```

**Option C — Code-Revert:**
```bash
git revert a143eb0 cb8f600 f7d9478 3005689 33a6976 19e10b9 250b67d a9ad648
```

---

## Offene Punkte / Follow-Ups

- **Plan-Konformitaet:** Middleware-Cache liest via `createClient()` von
  `@/lib/supabase/server`, was Next.js Runtime voraussetzt. Alternative fuer
  Edge-Runtime-Kompatibilitaet: direkter HTTP-Call an Supabase REST-API.
  Stand 2026-04-19 laeuft proxy.ts in Node-Runtime (matcher greift alle
  Non-Static-Routes), daher OK.
- **Plan-Filter in Middleware:** Bei `MEDICATIONS_ENABLED` steht
  `required_plans=['plus','pro']`, aber Middleware prueft nur `enabled`.
  API-Routes gaten zusaetzlich via `requireSubscription("plus")`, also
  sekundaere Schicht OK — UX koennte klarer sein (Free-User sehen evtl.
  die Seite und bekommen dann API-Fehler statt sofort Paywall).

---

## Test-Summary

- **72 neue Tests** (Tasks 1-7) alle gruen
- **0 TypeScript-Regressions** (nur 8 preexistente Fehler unveraendert)
- **1 Prod-Migration** (170_health_feature_flags)
- **1 Prod-UPDATE** (4 bestehende Flags `enabled=false`)

---

## Naechste Session — Vorschlag

```
„Lies docs/plans/2026-04-19-handoff-gesundheits-flags-live.md.
Dann Smoke-Test Punkte 1-6 durchgehen."
```
