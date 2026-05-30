# invite_code-REVOKE-Folge-Welle (2026-05-30)

Folge-Welle zu PR #28 (Mig `20260529120000_quarter_isolate_stammdaten`). Dort wurde der
Spaltenschutz fuer `households.invite_code` bewusst ausgeklammert (Founder-Split), weil
`admin/page.tsx`, `useMapEditorState` und `household.service` per Browser-Client
`select("*")` laden. Diese Welle holt den Spaltenschutz nach + baut den dafuer noetigen
Admin-Service-Role-Lesepfad.

Schliesst Security-Finding **H1-Rest** / Pre-Pilot-Audit: nach der Row-Isolation (PR #28)
sieht ein Mitglied zwar nur Haushalte im **eigenen** Quartier, kann aber `invite_code`
dieser Haushalte lesen → koennte sich als noch-nicht-beigetretener Nachbar ausgeben.

## Pre-Check (Code-verifiziert, nicht aus Plan-Texten) — 2026-05-30

Browser-Client-Lesepfade auf `households` (PostgREST wirft bei `select("*")`, sobald eine
Spalte fuer `authenticated`/`anon` nicht lesbar ist):

| Pfad | select | invite_code gebraucht? | Aktion |
|---|---|---|---|
| `lib/services/household.service.ts:15` `getHousehold` | `*` | Nein (Aufrufer `alerts/new/page.tsx:132` nutzt nur lat/lng) | explizite Spalten ohne invite_code |
| `lib/services/household.service.ts:27` `getHouseholdForUser` | `household:households(*)` | Nein (Aufrufer `profile/page.tsx:204` nutzt nur street/house) | eingebettete explizite Spalten ohne invite_code |
| `lib/services/household.service.ts:72` `getHouseholdsByQuarter` | `*` | Nein (kein Laufzeit-Aufrufer, nur Export+Test) | explizite Spalten ohne invite_code |
| `app/(app)/admin/components/map/useMapEditorState.ts:75` `loadHouseholds` | `*` | Nein (nur street/house/members) | explizite Spalten ohne invite_code |
| `app/(app)/admin/page.tsx:145` `loadData` | `*` | **Ja** → speist `InviteCodeManager` (Anzeige) + `HouseholdManagement` (Z.97 Suche, Z.308 Anzeige) | **neue Admin-Service-Role-Route** |

> **Korrektur zum Explore-Agent-Befund:** Der Caller-Inventur-Agent klassifizierte
> `getHouseholdForUser` (Z.27) faelschlich als Server-Pfad. Beim eigenen Lesen erkannt: es
> ist ein **Browser**-Pfad mit eingebettetem `households(*)` → bricht ebenfalls. Lehre: bei
> Sicherheit den Code selbst lesen, Agent-Inventur nur als Startpunkt.
>
> Die uebrigen eingebetteten `household:households(...)`-Selects (family/alerts,
> useDashboardData, invitations, admin alerts, VerificationQueue, welcome-pack,
> map-activity-feed, alerts.service) nutzen alle **explizite** Spalten (street/house/lat/lng/
> quarter_id) → fragen invite_code nicht an → unveraendert. Die `*Server`-Funktionen haben
> keine Laufzeit-Aufrufer.

Schreibpfade (`InviteCodeManager` create/regenerate/revoke via Browser) brechen **nicht** —
INSERT/UPDATE/DELETE ohne `.select()`-Returning. Bleiben in dieser Welle unveraendert
(Scope-Disziplin; Folge-Punkt: Schreiben server-seitig kapseln).

Service-Role-Lesepfade (`getHouseholdServer`, `pilot.service`, `registration.service`,
`getHouseNumbersByStreet`) brechen nicht (Service-Role umgeht column-grants).

Keine `/api/admin/households`-Route existiert (geprueft) → Neubau, kein Duplikat.

## Mini-Audit (2026-05-30) — Trigger: Grant-/RLS-Change + neuer Admin-Lesepfad

- **RLS/Grants geprueft:** `households`. Prod-Grants gelesen (read-only via MCP):
  `anon` + `authenticated` haben je **table-level SELECT** *und* separaten
  **column-level SELECT(invite_code)** (Supabase-Default). Beide Wege muessen weg, sonst
  greift einer weiter.
- **Prod-Spalten gelesen** (kein Drift vs. types): 21 Spalten, 20 erlaubt (ohne invite_code).
- **Regression-Falle vermieden:** Service-Role umgeht RLS. Die neue Route bestimmt die
  Haushalts-**Sichtbarkeit** weiter ueber den **user-scoped SSR-Client** (RLS bleibt
  massgeblich → super_admin alle / quarter_admin eigenes Quartier; kein Scope-Bug moeglich)
  und reichert `invite_code` nur via Service-Role fuer **genau die schon sichtbaren IDs** an
  (kein IDOR — IDs stammen aus dem RLS-Query, nicht vom Client).
- **Audit-Trail:** n/a (kein Auth-/Consent-/Claim-Pfad, reiner Lese-Endpoint).
- **Rate-Limit:** n/a (GET, Admin-gated, kein Token-/Code-Lookup).
- **Findings:** 0 CRITICAL/HIGH.

## Migration `20260530xxxxxx_revoke_invite_code_select.sql`

```sql
BEGIN;
REVOKE SELECT ON public.households FROM anon, authenticated;
REVOKE SELECT (invite_code) ON public.households FROM anon, authenticated;
GRANT SELECT (
  id, street_name, house_number, lat, lng, verified, created_at, quarter_id,
  map_house_id, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
  postal_code, city, position_source, position_accuracy, position_verified,
  position_verified_at, position_manual_override, position_raw_payload
) ON public.households TO authenticated, anon;
COMMIT;
```

`service_role` unangetastet (liest invite_code weiter → Admin-Route + bestehende
Server-Pfade). Durable Lehre: column-grants sind explizit → **kuenftige households-Spalten
brauchen eigenen `GRANT SELECT (<spalte>)`**, sonst sind sie fuer authenticated unsichtbar.

## API-Route `app/api/admin/households/route.ts` (GET)

1. SSR-`createClient` → `auth.getUser()` (401) → `users.is_admin` (403). Pattern wie
   `app/api/admin/youth/overview/route.ts`.
2. Sichtbarkeit: `ssr.from("households").select("<20 Spalten>").order("street_name")`
   (RLS-scoped, ohne invite_code).
3. `memberCount`: `ssr.from("household_members").select("household_id")` (RLS-scoped, wie
   bisher im Client).
4. invite_code-Anreicherung: `adminDb.from("households").select("id, invite_code").in("id", sichtbareIds)`.
5. Antwort: **Array** `(Household & { memberCount })[]` (CLAUDE.md: Listen als Array, nie `{items}`).

## TDD-Reihenfolge (RED zuerst)

1. Migration-Static-Test `__tests__/lib/revoke-invite-code-select-migration.test.ts`.
2. Route-Test `app/api/admin/households/route.test.ts` (401/403/200, invite_code-Merge,
   memberCount, Array-Form).
3. `household.service.test.ts` anpassen: getHousehold/getHouseholdsByQuarter nutzen explizite
   Spalten, kein invite_code.

## Geaenderte/neue Dateien

- `supabase/migrations/20260530160000_revoke_invite_code_select.sql` (neu, File-first, NICHT appliziert)
- `app/api/admin/households/route.ts` (neu) + `route.test.ts` (neu)
- `lib/services/household.service.ts` (HOUSEHOLD_SELECT_COLUMNS + HouseholdPublic + 3 Browser-Funktionen)
- `lib/services/index.ts` (re-export HOUSEHOLD_SELECT_COLUMNS + HouseholdPublic)
- `lib/services/__tests__/household.service.test.ts` (angepasst + Spaltenschutz-Tests)
- `app/(app)/admin/components/map/useMapEditorState.ts` (explizite Spalten)
- `app/(app)/admin/page.tsx` (loadData → fetch /api/admin/households)
- `app/(app)/profile/page.tsx` (State-Type HouseholdPublic)
- `__tests__/lib/revoke-invite-code-select-migration.test.ts` (neu)

## Verifikation (2026-05-30) — alles lokal gruen

- `tsc --noEmit`: 0 Fehler.
- `eslint` (alle beruehrten Dateien): 0 Fehler.
- `vitest run` voll: **677 Dateien / 4882 Tests passed, 1 skip, 0 failed** (mit `--maxWorkers=4`;
  bei Default-Workern crashen einzelne Forks per OOM → keine echten Failures).
- Branch-Replay nicht praktikabel (Prod-Drift stoppt bei Mig 002) → Mig-Static-Test (6) +
  Route-Test (4) + Service-Test deckt die Logik ab; manuelle Prod-Grant-Probe nach Apply.

## Rote Zone (Founder-Go) — SICHERE REIHENFOLGE

Der Code ist invite_code-tolerant: alle Lesepfade funktionieren mit UND ohne die Mig
(sie fragen invite_code nicht mehr per Browser an). Daher:

1. **Push** Code+Mig-Datei auf `master` → CI (CodeQL + E2E Multi-Agent). Mig-Datei im Repo
   wird NICHT automatisch appliziert.
2. **Deploy** via `workflow_dispatch` ("Deploy to Vercel Production") → neuer Code live
   (Admin-Panel nutzt ab jetzt die Service-Role-Route).
3. **DANN Prod-Apply** der Mig (`npx supabase db query --linked -f
   supabase/migrations/20260530160000_revoke_invite_code_select.sql` +
   `migration repair --linked --status applied 20260530160000`).

> WICHTIG: Mig NICHT vor dem Deploy applien — der noch-live alte Code (`admin/page.tsx`
> `select("*")`) braeche zwischen Apply und Deploy. Code-zuerst ist bruchfrei.

Nach Apply: Prod-Grant-Probe (`information_schema.role_table_grants` /
`column_privileges` auf households) — invite_code-SELECT fuer anon/authenticated weg,
20 uebrige Spalten da, service_role unveraendert.
