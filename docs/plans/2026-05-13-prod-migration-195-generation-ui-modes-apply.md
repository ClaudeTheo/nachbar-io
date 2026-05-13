# Prod-Migration 195: Generationen-Modi fuer users.ui_mode angewendet

Datum: 2026-05-13
Owner: Codex
Scope: Production-DB, Migration 195, kein Vercel-Env-/Secrets-/Billing-/Provider-Live-Change.

## Founder-Go

Thomas entschied in dieser Session fuer Option A:

```text
wir machen a
```

Damit war der zuvor besprochene Weg "Migration 195 mit Preflight, Apply und
anschliessendem Push" freigegeben.

## Sinncheck

Der lokale Generationen-Modi-Code kann `youth` und `comfort` in
`public.users.ui_mode` schreiben. Prod hatte vor Migration 195 noch die alte
CHECK-Constraint fuer nur `active` und `senior`. Ohne Migration waere ein Push
des Codes migrationsinkompatibel gewesen.

## Preflight

Ausgefuehrt:

```powershell
npx supabase db query --linked --output table "select version, name from supabase_migrations.schema_migrations where version = '195';"
npx supabase db query --linked --output table "select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'public.users'::regclass and conname = 'users_ui_mode_check';"
npx supabase db query --linked --output table "select ui_mode, count(*)::int as rows from public.users group by ui_mode order by ui_mode;"
npx supabase db query --linked --output table "select count(*)::int as real_users from public.users where coalesce(is_tester, false) is not true;"
```

Befund:

- `schema_migrations` hatte vor Apply keinen Eintrag fuer Version `195`.
- `users_ui_mode_check` erlaubte nur `active` und `senior`.
- Bestehende Prod-Daten: 3 Nutzer mit `ui_mode = active`, keine `youth`-/`comfort`-Rows.
- Realnutzer-Auto-Stop: 0 Nicht-Testnutzer.

## Apply

Ausgefuehrt:

```powershell
npx supabase db query --linked --file "supabase\migrations\195_generation_ui_modes.sql"
npx supabase migration repair --linked --status applied 195
```

Ergebnis:

- SQL-Datei erfolgreich angewendet.
- Migration-History repariert: `[195] => applied`.

## Verification

Ausgefuehrt:

```powershell
npx supabase db query --linked --output table "select version, name, array_length(statements, 1) as statements from supabase_migrations.schema_migrations where version = '195';"
npx supabase db query --linked --output table "select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid = 'public.users'::regclass and conname = 'users_ui_mode_check';"
npx supabase db query --linked --output table "select ui_mode, count(*)::int as rows from public.users group by ui_mode order by ui_mode;"
```

Ergebnis:

- `schema_migrations`: Version `195`, Name `generation_ui_modes`, 2 Statements.
- `users_ui_mode_check` erlaubt `youth`, `active`, `comfort`, `senior`.
- Bestehende Prod-Daten unveraendert: 3 Nutzer mit `ui_mode = active`.

## Grenzen

- Keine Vercel-Env-/Secret-/Billing-Aenderung.
- Kein Provider-Live-Switch.
- Keine neuen laufenden Kosten.
- Visual-Polish unveraendert.
