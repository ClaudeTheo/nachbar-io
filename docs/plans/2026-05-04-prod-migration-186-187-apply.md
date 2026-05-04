# Prod-Migration 186/187 Apply

Datum: 2026-05-04
Zeitfenster: ca. 17:50-18:00 MESZ
Ausfuehrender Agent: Codex
Founder-Go: `MIGRATION-PROD-GO-186-187`

## Scope

Erlaubt und ausgefuehrt:

- Migration 186 auf Supabase-Prod anwenden.
- Migration 187 auf Supabase-Prod anwenden.
- Beide Versionen im Supabase-Migrations-Tracking als angewendet markieren.
- Read-only SQL-Checks gemaess Runbook.
- Unauthentifizierter Live-Smoke gegen `https://nachbar-io.vercel.app`.

Nicht ausgefuehrt:

- keine anderen Prod-DB-Schreibaktionen
- keine Vercel-Env-Aenderung
- keine Secrets gelesen oder ausgegeben
- kein Vercel-Deploy
- kein Git-Push

## Preflight

Gelesene Startdokumente:

- `AGENTS.md`
- `nachbar-io/AGENTS.md`
- `nachbar-io/docs/plans/handoff/INBOX.md`
- `nachbar-io/docs/plans/handoff/2026-05-04-codex-new-session-handover-live-owasp-migration-go.md`
- `nachbar-io/docs/plans/2026-05-04-migration-runbook-186-187.md`

Git:

- Lokaler `HEAD`: `59db13c8de8f27297a0cca1ac532b09eb60a6aee`
- `origin/master`: `acd2e9bd57025a65a39314eb104b30204631f7ab`
- Abweichung: lokaler Handover-Commit `59db13c` liegt wie angekuendigt vor
  `origin/master`; keine Code-Aenderung gegenueber dem live-deployten Stand.
- Bekannte alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid`
  blieben unberuehrt.

Production-Deploy:

- `vercel list --format json --status READY --environment production --yes`
  zeigte als neuesten Production-Deploy
  `nachbar-k9ai8lh6w-thomasth1977s-projects.vercel.app`.
- `githubCommitSha`: `acd2e9bd57025a65a39314eb104b30204631f7ab`
- Alias laut Handover: `https://nachbar-io.vercel.app`

Pre-Smoke:

| Route | Ergebnis |
|---|---|
| `/` | 200 |
| `/api/health` | 200 |
| `/api/messages` | 503 Closed-Pilot |

Read-only DB vor Apply:

- `schema_migrations` hatte keine Zeilen fuer `186` oder `187`.
- `care_helper_role` und `is_care_helper_for` existierten, enthielten aber nur
  Legacy-`care_helpers` und noch kein `caregiver_links`.
- `public.emergency_profiles` hatte `pdf_token` und `pdf_token_expires_at`.
- `pdf_token_hash` fehlte.
- Klartext-Token-Count vor Apply: `0`.

## Apply-Pfad

Migration 186:

```powershell
npx supabase db query --linked -f "supabase\migrations\186_carecircle_rls_bridge.sql"
npx supabase migration repair 186 --status applied --linked --yes
```

Migration 187:

```powershell
npx supabase db query --linked -f "supabase\migrations\187_emergency_pdf_token_hash.sql"
npx supabase migration repair 187 --status applied --linked --yes
```

## Read-only SQL-Checks nach Apply

Migration 186:

- `care_helper_role` ist PL/pgSQL, `security definer`, `stable`.
- Definition enthaelt `caregiver_links`.
- Definition enthaelt `revoked_at is null`.
- `volunteer` wird auf `neighbor` gemappt.
- alle anderen `caregiver_links.relationship_type` Werte werden auf `relative`
  gemappt.
- `is_care_helper_for` ist PL/pgSQL, `security definer`, `stable`.
- Definition enthaelt `caregiver_links`.
- Definition enthaelt `revoked_at is null`.
- `schema_migrations`: `186 / carecircle_rls_bridge`.

Migration 187:

- `pdf_token` existiert weiter als `text`, nullable.
- `pdf_token_expires_at` existiert weiter als `timestamp with time zone`,
  nullable.
- `pdf_token_hash` existiert als `text`, nullable.
- Index `emergency_profiles_pdf_token_hash_idx` existiert als Unique-Index auf
  `pdf_token_hash`.
- Index ist partiell mit `WHERE (pdf_token_hash IS NOT NULL)`.
- `cleartext_token_rows = 0`.
- `hashed_token_rows = 0`.
- `schema_migrations`: `187 / emergency_pdf_token_hash`.

Hinweis zur Verifikation:

- Drei direkt parallele read-only Checks nach 187 liefen in CLI-Timeouts.
- Eine Index-Abfrage danach lieferte das korrekte Ergebnis, zeigte aber
  kurzzeitig Supabase-Pooler-Circuit-Breaker-Meldungen wegen zu vieler schneller
  Auth-Versuche.
- Nach 75 Sekunden Pause lief eine kombinierte read-only Abfrage erfolgreich
  durch und bestaetigte Spalten, Index, Counts und Migrations-Tracking.

## Live-Smoke nach Apply

Unauthentifiziert gegen `https://nachbar-io.vercel.app`:

| Route | Ergebnis |
|---|---|
| `/` | 200 |
| `/api/health` | 200, Body `{"status":"ok"}` |
| `/api/messages` | 503, Body enthaelt `closed_pilot` |

## Ergebnis

Migration 186 und 187 wurden am 2026-05-04 unter dem Founder-Go
`MIGRATION-PROD-GO-186-187` auf Supabase-Prod angewendet und im
Migrations-Tracking markiert. Die read-only SQL-Checks und der
unauthentifizierte Live-Smoke sind erfolgreich.
