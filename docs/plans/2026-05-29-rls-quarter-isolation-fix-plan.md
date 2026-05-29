# Fix-Plan Paket 2 — RLS-Quartier-Isolation (Security H1/H3/M1/L1 + DSGVO W5)

**Stand:** 2026-05-29, Pre-Check abgeschlossen. Code-autoritativ verifiziert (nicht aus Audit-Bericht übernommen).
**Ziel:** `households`/`users`/`map_houses` quarter-isolieren + `invite_code` schützen + `/api/alerts` Adress-Leak schließen.

## Pre-Check-Befunde (Abweichungen vom Audit-Einzeiler!)

| Punkt | Audit-Bericht sagte | Code-Realität (verifiziert) |
|---|---|---|
| Helper-Funktionen | wiederverwenden | ✅ `get_user_quarter_id()`, `is_super_admin()`, `is_quarter_admin_for(uuid)` existieren (Mig 051:347/387/400); `is_verified_member()` (Mig 001:291) |
| households.quarter_id | `quarter_id = get_user_quarter_id()` | ✅ **households HAT quarter_id** (Mig 051:79, NOT NULL) → direkter Filter OK |
| users.quarter_id | (impliziert direkt) | ❌ **users hat KEIN quarter_id** → Filter via `household_members`→`households.quarter_id` (Join/EXISTS) |
| map_houses.quarter_id | (impliziert direkt) | ❌ **map_houses hat KEIN quarter_id** → Filter via `household_id`→`households.quarter_id` |
| Registrierung | — | ✅ läuft über Service-Role (umgeht RLS, Mig 040:12) → households-SELECT-Scope bricht Registrierung NICHT |
| /api/alerts Leak | `getLocationForRole` anwenden | ⚠️ Leak ist der **households-Join** (`route.ts:25`, street/house/lat/lng), NICHT `alert.location_*`. `getLocationForRole` löst nur Alert-GPS. **Zwei getrennte Fixes nötig.** |
| Aktuelle Policies | — | `households_read_authenticated` (Mig 040:18, `auth.uid() IS NOT NULL`); `users_read_verified` (Mig 001:315, `is_verified_member()`); `map_houses_read` (Mig 007) |
| Migrations-Format | — | neueste nutzen Timestamp `20260527191000…` → neue Mig: `20260529NNNNNN_...` |

## Security-Mini-Audit (Pflicht-Block, Regel `.claude/rules/security-mini-audit.md`)

```
Mini-Audit RLS-Welle (2026-05-29):
- RLS/Trigger geprueft: households, users, map_houses, household_members, verification_requests
- Findings die gefixt werden: H1 (households cross-quarter + invite_code), M1 (users cross-quarter), L1 (map_houses), H3/W5 (/api/alerts Adress-Leak)
- Trigger-Inventar: households_update (Mig 040:85, eng), hm_insert_restricted (eng), enforce_user_update_restrictions (Mig 198, is_admin/role/trust_level sticky) — werden NICHT verändert
- Privilege-Spalten: invite_code (households) bisher ungeschützt → column-REVOKE; users-Privilege-Spalten bleiben Trigger-geschützt
- Audit-Trail: RLS-Policy-Aenderung selbst, kein neuer User-Schreibpfad
- Rate-Limit: n/a (kein neuer Token-/Code-Pfad)
- STOP-Kriterium: keine CRITICAL/HIGH NEU eingefuehrt; reine Verschaerfung bestehender Lese-Policies
```

## Migrations-Plan (`20260529NNNNNN_quarter_isolate_stammdaten.sql`)

**households** (hat quarter_id direkt):
```sql
DROP POLICY IF EXISTS "households_read_authenticated" ON households;
CREATE POLICY households_quarter_select ON households FOR SELECT USING (
  quarter_id = get_user_quarter_id() OR is_super_admin() OR is_quarter_admin_for(quarter_id)
);
-- invite_code column-level schützen (RLS ist nicht spaltengenau):
REVOKE SELECT (invite_code) ON households FROM authenticated, anon;
-- (Registrierung nutzt Service-Role/postgres → unberührt)
```

**users** (kein quarter_id → Join; eigene Zeile bleibt über `users_read_own`):
```sql
DROP POLICY IF EXISTS "users_read_verified" ON users;
CREATE POLICY users_quarter_select ON users FOR SELECT USING (
  id = auth.uid()  -- eigene Zeile (Redundanz zu users_read_own ok)
  OR is_super_admin()
  OR EXISTS (
    SELECT 1 FROM household_members hm JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = users.id AND h.quarter_id = get_user_quarter_id()
  )
);
```
> ⚠️ Verifizieren: wie ermittelt `get_user_quarter_id()` das Quartier (vmtl. via household_members des Aufrufers)? EXISTS-Subquery darf nicht mit RLS auf household_members/households rekursiv kollidieren → ggf. SECURITY DEFINER Helper `is_same_quarter_user(target_user)` analog `is_interest_group_creator` (Pattern aus Mig 20260527191000).

**map_houses** (kein quarter_id → via household_id):
```sql
DROP POLICY IF EXISTS "map_houses_read" ON map_houses;
CREATE POLICY map_houses_quarter_select ON map_houses FOR SELECT USING (
  is_super_admin()
  OR EXISTS (SELECT 1 FROM households h WHERE h.id = map_houses.household_id AND h.quarter_id = get_user_quarter_id())
);
```
> ⚠️ map_houses-Schema prüfen: Spalte `household_id` vorhanden? (Mig 007/010/016). Falls map_houses NICHT immer ein household_id hat (freie Karten-Pins), Fallback definieren.

## /api/alerts-Plan (`app/api/alerts/route.ts:22-28`)
1. `household:households(street_name, house_number, lat, lng)` aus dem Listen-Select **entfernen** (oder auf `house_number` allein reduzieren, falls UI es zwingend braucht — UI-Check nötig).
2. Für `alert.location_lat/lng`: nach dem Fetch pro Alert `getLocationForRole(alert, role, isConfirmedHelper)` anwenden — Rolle des Abrufers + Helfer-Status bestimmen. `roundCoordinates` als Default. (Helper existiert: `modules/alerts/services/location-visibility.ts`.)
3. Test: `__tests__/...alerts...` — Free-Rolle sieht keine exakten Koordinaten, keine Hausnummer.

## Test-/Verifikations-Strategie
- **TDD:** RED-Tests zuerst (RLS-Isolation + alerts-Location-Minimierung).
- **RLS-Test lokal:** Lokaler Supabase-Stack ist laut Memory **replay-fähig nur bis Mig 178** — Mig 198+ + diese neue Mig ggf. nicht sauber lokal replaybar. → Entweder Stack-Replay-Stand prüfen/erweitern, ODER RLS-Verhalten über Supabase-Branch-Test (MCP `create_branch` + `apply_migration`) verifizieren. **Branch-Test = Founder-Go-frei (kein Prod), Prod-Apply = Founder-Go.**
- tsc + vitest grün vor Commit. File-first (Datei vor `schema_migrations`-Insert).

## Rote Zonen
- **Prod-Migration-Apply = Founder-Go.** Merge nach master = Founder-Go.
- Branch-Test (Supabase-Branch) ist erlaubt (kein Prod-Schreiben).

## Reihenfolge (TDD)
1. RED-Tests (RLS-Isolation + alerts-Minimierung) → rot.
2. Migration schreiben (households direkt; users/map_houses via SECURITY-DEFINER-Helper falls Rekursion droht).
3. /api/alerts umbauen.
4. GREEN: Tests + tsc + vitest. RLS via Supabase-Branch verifizieren.
5. Commit + PR. Merge + Prod-Apply = Founder-Go.

## Implementierungs-Ergebnis (2026-05-29, Branch `chore/security/rls-quarter-isolation-2026-05-29`)

**Founder-Entscheidung: Welle gesplittet.** Diese Welle = Zeilen-Quartier-Isolation + /api/alerts-Minimierung. Der `invite_code`-Spalten-REVOKE wurde HERAUSGENOMMEN, weil der Pre-Check zeigte, dass er die Admin-UI bricht: `admin/page.tsx:145`, `useMapEditorState.ts:75` und `household.service.ts` laden `households.select("*")` ueber den Browser-Client (authenticated); ein Spalten-REVOKE laesst diese Queries komplett fehlschlagen (`permission denied for column invite_code`). → eigene Folge-Welle mit Admin-Service-Role-Lesepfad.

**Dateien:**
- `supabase/migrations/20260529120000_quarter_isolate_stammdaten.sql` — 2 SECURITY-DEFINER-Helper (`is_same_quarter_user`, `is_household_in_my_quarter`, beide `SET search_path = public, pg_temp` + REVOKE/GRANT) + 3 SELECT-Policies (households direkt via `quarter_id`, users + map_houses via Helper, map_houses mit `household_id IS NULL`-Fallback fuer freie Pins). `users_read_own` + `map_houses_user_upsert` bleiben.
- `app/api/alerts/route.ts` — GET: households-Join entfernt, `getLocationForRole` pro Alert (Tier via caregiver_links/org_members/doctor_profiles, `isConfirmedHelper` via gebatchte alert_responses).
- `__tests__/lib/quarter-isolate-stammdaten-rls-migration.test.ts` (7 Tests, statische SQL-Analyse) + `app/api/alerts/route.test.ts` (8 Tests, GET-Minimierung + POST-Validierung; konsolidiert das geloeschte `__tests__/api/alerts.test.ts`).

**Verifikation:** vitest 15/15 (neu) + 106/106 (alle alerts-bezogenen) gruen; `tsc --noEmit` gruen; eslint gruen.

**Branch-Test NICHT durchfuehrbar (dokumentierter Blocker):** Supabase-Branch `rls-quarter-isolation-test` (`hghnzdkinyljnyslclxf`) erstellt, aber `MIGRATIONS_FAILED` — der Branch-Replay stoppt bereits bei **Migration 002** (verifiziert: `get_user_quarter_id`/`is_super_admin`/`map_houses` aus Mig 007/051 fehlen). Der Prod-Drift macht den Branch-Replay noch kaputter als den lokalen Stack (Mig 178). Meine Migration baut auf Mig 007 + 051, daher im Branch nicht testbar — exakt die group_members-Saga (Pass 126), die deshalb via `db query --linked` auf Prod mit Founder-Go appliziert wurde. Branch wieder geloescht (keine laufenden Kosten). **Korrektheits-Stuetzen statt Branch-Test:** (1) statische SQL-Tests gruen, (2) households-Policy = exaktes Mig-052-Muster (in Prod bewaehrt), (3) Helper = exaktes Mig-20260527191000-Muster (in Prod bewaehrt), (4) Rekursionsfreiheit durch SECURITY DEFINER.

**Founder-Prod-Apply-Verifikation (nach Go):** Migration via `npx supabase db query --linked -f supabase/migrations/20260529120000_quarter_isolate_stammdaten.sql` + `migration repair --linked --status applied 20260529120000`. Danach Smoke: `SELECT polname, cmd FROM pg_policies WHERE tablename IN ('households','users','map_houses')` — erwartet `households_quarter_select`, `users_quarter_select`, `map_houses_quarter_select` + Eigen-/Upsert-Policies; `households_read_authenticated`/`users_read_verified`/`map_houses_read` weg.

**Rekursions-Analyse:** `get_user_quarter_id()` (Mig 051) ist `SECURITY DEFINER` → umgeht RLS. Die neuen Helper sind ebenfalls SECURITY DEFINER → kein Rekursionsrisiko trotz `household_members`/`households`-Zugriff in der Policy-Auswertung.
