# Supabase spatial_ref_sys Support-Closeout

Stand: 2026-06-12. Scope: Prod nur read-only, kein Migration-Apply, kein
Merge. Projekt: `uylszchlyhbpbmslcnka`. Supabase Support-Ticket: `SU-393741`.

## Ergebnis

Supabase Support hat PostGIS am 2026-06-11 serverseitig von `public` nach
`extensions` verschoben. Damit ist der Advisor-Fund `rls_disabled_in_public` fuer
`public.spatial_ref_sys` erledigt, ohne dass wir Owner-only RLS-DDL auf der
Extension-Tabelle ausfuehren muessen.

## Prod-Read-only-Verifikation

- `to_regclass('public.spatial_ref_sys')`: `null`
- `to_regclass('extensions.spatial_ref_sys')`: `spatial_ref_sys`
- `pg_extension`: `postgis` liegt in `extensions`, `extversion=3.3.7`
- `extensions.spatial_ref_sys`: Owner `supabase_admin`, `relrowsecurity=false`,
  `relforcerowsecurity=false`
- Grants auf `extensions.spatial_ref_sys` fuer `anon` und `authenticated`:
  `DELETE`, `INSERT`, `REFERENCES`, `SELECT`, `TRIGGER`, `TRUNCATE`, `UPDATE`
- Bewertung Grants: Die breiten Grants bleiben technisch sichtbar, liegen aber
  im Schema `extensions` und nicht mehr im exponierten `public`-Schema. Das ist
  der Sicherheitsgewinn des Support-Fixes; kein App-Pfad schreibt auf diese
  Referenztabelle.

## Security Advisor

- Der alte Fund `rls_disabled_in_public` fuer `spatial_ref_sys` ist nicht mehr
  vorhanden.
- Aktuell verbleibende Advisor-Themen sind nicht `spatial_ref_sys`-spezifisch:
  `security_definer_view` auf `public.quarter_collection_areas`,
  `function_search_path_mutable` auf mehreren `public`-Funktionen inklusive der
  Geo-Funktionen, `rls_enabled_no_policy` auf Audit-/Forensik-Tabellen,
  permissive RLS-Policies, ausfuehrbare `SECURITY DEFINER`-Funktionen fuer
  `authenticated`, sowie Auth-Hinweise zu Leaked-Password-Protection/MFA.
- Relevante Supabase-Remediation-Links:
  https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
  und
  https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

## Search Path

- `SHOW search_path` als `postgres`: `"$user", public, extensions`
- Role-Settings: `anon` hat nur `statement_timeout=3s`, `authenticated` nur
  `statement_timeout=8s`, `service_role` hat kein explizites Role-Setting,
  `postgres` setzt `search_path="$user", public, extensions`.
- Bewertung: Unqualifizierte `st_*`-Aufrufe funktionieren weiter, weil
  `extensions` im effektiven Search Path liegt.

## Grep und DB-Objekt-Pruefung

- App-Code-Grep auf `public.st_`, `public.geometry`, `public.geography`,
  `public.spatial_ref_sys`, `public.postgis`: 0 Treffer ausserhalb der
  reparierten Legacy-Migration, ihres Tests und alter Doku-Erwaehnungen.
- Prod-DB-Objekte: Views, Funktionen, Indizes, RLS-Policies und Column-Defaults
  enthalten 0 Treffer fuer schema-qualifizierte
  `public.(st_|geometry|geography|spatial_ref_sys|postgis)`-Referenzen.

## Geo-Smoke

Read-only Smoke gegen Prod:

- `postgis_version()`: `3.3 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`
- `ST_Distance(...)`: `337.34` Meter
- `ST_DWithin(..., 500)`: `true`
- `find_nearest_seeding_quarter(47.5628, 7.9452, 5000)`: 0 Rows, kein Fehler
- `find_quarter_containing_point(47.5628, 7.9452)`: 0 Rows, kein Fehler

Bewertung: PostGIS-Funktionen und app-spezifische Geo-RPCs sind nach dem
Schema-Umzug erreichbar. Die 0 Rows sind Daten-/Testpunkt-Ergebnis, kein
Funktionsfehler.

## Migrations-Reparatur

`supabase migration list --linked` zeigte vor der Reparatur die Divergenz:
lokal `20260610100000`, remote `20260610193356`.

Entscheidung: lokale Datei in
`supabase/migrations/20260610193356_spatial_ref_sys_rls_readonly.sql` umbenennen
und nicht per `supabase migration repair` in Prod schreiben. Grund: Prod darf in
diesem Abschluss nur read-only beruehrt werden, und remote ist bereits die
angewendete Version `20260610193356`.

Der Inhalt liegt jetzt komplett hinter
`IF to_regclass('public.spatial_ref_sys') IS NULL THEN ... RETURN; END IF;`.
Dadurch ueberspringt ein frischer Push gegen die support-seitig umgezogene Prod
das Legacy-Hardening sauber statt mit `undefined_table` zu scheitern. Wenn
`public.spatial_ref_sys` lokal oder in einem Alt-Projekt noch existiert, bleiben
`REVOKE ALL`, `GRANT SELECT` und der best-effort-RLS-Block erhalten.

## Lokale Dev-Divergenz

Lokale Supabase-Stacks koennen PostGIS weiterhin in `public` fuehren. Das ist fuer
Tests akzeptabel: Die Migration ist bewusst dual-kompatibel. Ein grosser lokaler
Umbau auf `extensions` ist nicht Teil dieses Fixes und wuerde Superuser-/Stack-
Details beruehren, die fuer den aktuellen Prod-Abschluss nicht erforderlich sind.

## Leitplanken

- Keine Prod-Schreibaktion.
- Kein `apply_migration`, kein `supabase migration repair`, kein Merge auf
  `master`.
- Keine Secrets in Logs oder Commits.
