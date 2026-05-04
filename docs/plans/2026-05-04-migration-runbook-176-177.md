# Migration-Runbook 176/177

Stand: 2026-05-04

## Ziel

Dieses Runbook bereitet das kontrollierte Anwenden der Prod-Migrationen 176 und
177 vor. Beide Migrationen sind Voraussetzung, bevor echte Pilot-Familien in
Phase 1 eingeladen werden.

| Migration | Zweck | Status |
|---|---|---|
| `176_feature_flags_audit_log.sql` | Audit-Trail fuer Feature-Flag-Aenderungen: `feature_flags.last_change_reason`, `feature_flags_audit_log`, Trigger und Admin-Read-Policy. | Datei committed, auf Prod offen |
| `177_pilot_phase_flags.sql` | Schutzflags fuer Phase 1 anlegen: `BILLING_ENABLED=false`, `TWILIO_ENABLED=false`, `CHECKIN_MESSAGES_ENABLED=false`. | Datei committed, auf Prod offen |

## Harte Grenzen

Nicht ohne separaten, eindeutigen Founder-Go-Satz:

- kein Prod-DB-Write
- kein `apply_migration`
- kein SQL `INSERT`, `UPDATE`, `ALTER`, `CREATE`, `DROP` gegen Prod
- kein `schema_migrations`-Insert oder `migration repair`
- keine Vercel-Env-Aenderung
- keine Secrets lesen, ziehen, drucken oder kopieren

## Exakter Founder-Go-Satz

Codex darf die Prod-DB nur anfassen, wenn Thomas in der aktuellen Session
exakt diesen Satz schreibt:

`MIGRATION-PROD-GO-176-177`

Alles andere, etwa "ok go", "mach weiter" oder "go", reicht fuer die
Prod-DB-Schreibaktion nicht.

## Preflight Stand 2026-05-04

Read-only geprueft:

- `feature_flags` enthaelt die Basisspalten `key`, `enabled`,
  `required_roles`, `required_plans`, `enabled_quarters`, `description`.
- `feature_flags.last_change_reason` fehlt noch.
- `users` enthaelt `id`, `is_admin`, `is_tester`, `settings`.
- `schema_migrations` hat keine Eintraege fuer `176`, `177`, `178`.
- `public.feature_flags_audit_log` fehlt.
- `public.log_feature_flag_change()` fehlt.
- Trigger `feature_flags_audit_log_trigger` fehlt.
- `AI_PROVIDER_OFF=true`.
- `AI_PROVIDER_CLAUDE=false`.
- `AI_PROVIDER_MISTRAL=false`.
- `BILLING_ENABLED`, `TWILIO_ENABLED`, `CHECKIN_MESSAGES_ENABLED` fehlen.
- `public.users` hat `0` Nutzer mit `coalesce(is_tester,false) is false`.

Hinweis: Mehrere parallele Supabase-CLI-Read-only-Verbindungen koennen den
Pooler-Circuit-Breaker triggern. Fuer die Apply-Session Abfragen einzeln oder
gebuendelt und mit Pause ausfuehren.

## Preflight vor Apply

### 1. Git- und Deploy-Stand pruefen

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/master
vercel list --format json --status READY --environment production --yes
```

Pass:

- `HEAD` und `origin/master` sind synchron oder die Abweichung ist reine
  Handover-/Runbook-Doku.
- Production-Code ist mindestens `acd2e9b`, also OWASP-Fixes live.
- Keine aktiven unbekannten tracked Aenderungen.

### 2. App-Smoke vor Apply

```powershell
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/health" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/messages" -Method GET -SkipHttpErrorCheck
```

Pass:

| Route | Erwartung |
|---|---|
| `/` | 200 |
| `/api/health` | 200, Body `{"status":"ok"}` |
| `/api/messages` | 503 Closed-Pilot |

### 3. Prod-DB read-only Vorabfragen

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('176', '177', '178')
order by version;
```

Pass vor Apply:

- keine Zeile fuer `176`
- keine Zeile fuer `177`
- keine Zeile fuer `178`

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'feature_flags'
  and column_name in (
    'key',
    'enabled',
    'required_roles',
    'required_plans',
    'enabled_quarters',
    'description',
    'last_change_reason'
  )
order by column_name;
```

Pass:

- Basisspalten existieren.
- `last_change_reason` fehlt oder ist ein erwarteter Drift-Stand. Wenn sie
  existiert, Apply kann wegen `add column if not exists` trotzdem weitergehen.

```sql
select
  to_regclass('public.feature_flags_audit_log')::text as audit_table,
  exists (
    select 1
    from pg_trigger
    where tgname = 'feature_flags_audit_log_trigger'
  ) as trigger_exists,
  to_regproc('public.log_feature_flag_change')::text as audit_function;
```

Pass vor Apply:

- Audit-Tabelle/Funktion/Trigger fehlen oder sind erwarteter Drift. Wenn sie
  bereits existieren, stoppen und Drift dokumentieren.

```sql
select key, enabled
from public.feature_flags
where key in (
  'AI_PROVIDER_OFF',
  'AI_PROVIDER_CLAUDE',
  'AI_PROVIDER_MISTRAL',
  'BILLING_ENABLED',
  'TWILIO_ENABLED',
  'CHECKIN_MESSAGES_ENABLED'
)
order by key;
```

Pass:

- KI ist aus: `AI_PROVIDER_OFF=true`, Provider-Flags `false`.
- 177-Schutzflags fehlen vor Apply oder stehen bereits `false`.

```sql
select count(*) as non_tester_users
from public.users
where coalesce(is_tester, false) is false;
```

Pass:

- `0`, solange noch keine echten Pilot-Familien onboarded sind.

## Apply 176

Nur nach `MIGRATION-PROD-GO-176-177`.

Datei:

```text
supabase/migrations/176_feature_flags_audit_log.sql
```

Apply-Pfad:

```powershell
npx supabase db query --linked -f "supabase\migrations\176_feature_flags_audit_log.sql"
npx supabase migration repair 176 --status applied --linked --yes
```

### 176 Verify read-only

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'feature_flags'
  and column_name = 'last_change_reason';
```

Pass:

- `last_change_reason` existiert als `text`.

```sql
select
  to_regclass('public.feature_flags_audit_log')::text as audit_table,
  exists (
    select 1
    from pg_trigger
    where tgname = 'feature_flags_audit_log_trigger'
  ) as trigger_exists,
  to_regproc('public.log_feature_flag_change')::text as audit_function;
```

Pass:

- Audit-Tabelle existiert.
- Trigger existiert.
- Funktion existiert.

```sql
select count(*) as audit_rows
from public.feature_flags_audit_log;
```

Pass:

- Query funktioniert. `audit_rows` darf `0` sein.

```sql
select version, name
from supabase_migrations.schema_migrations
where version = '176';
```

Pass:

- `176 / feature_flags_audit_log`

## Apply 177

Nur nach erfolgreichem Apply + Verify von 176 und nach
`MIGRATION-PROD-GO-176-177`.

Datei:

```text
supabase/migrations/177_pilot_phase_flags.sql
```

Apply-Pfad:

```powershell
npx supabase db query --linked -f "supabase\migrations\177_pilot_phase_flags.sql"
npx supabase migration repair 177 --status applied --linked --yes
```

### 177 Verify read-only

```sql
select key, enabled
from public.feature_flags
where key in (
  'BILLING_ENABLED',
  'TWILIO_ENABLED',
  'CHECKIN_MESSAGES_ENABLED'
)
order by key;
```

Pass:

- Drei Zeilen vorhanden.
- Alle drei `enabled=false`.

```sql
select count(*) as audit_rows
from public.feature_flags_audit_log
where flag_key in (
  'BILLING_ENABLED',
  'TWILIO_ENABLED',
  'CHECKIN_MESSAGES_ENABLED'
);
```

Pass:

- Wenn 176-Trigger beim 177-Insert feuert: `audit_rows >= 3`.
- Wenn Supabase/Trigger-Kontext durch `auth.uid()` null ist, ist das ok;
  entscheidend ist, dass Inserts nicht fehlschlagen und kuenftige Admin-Toggles
  auditierbar sind.

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('176', '177')
order by version;
```

Pass:

- `176 / feature_flags_audit_log`
- `177 / pilot_phase_flags`

## App-Smoke nach Apply

Unauthentifiziert:

```powershell
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/health" -Method GET -SkipHttpErrorCheck
Invoke-WebRequest -Uri "https://nachbar-io.vercel.app/api/messages" -Method GET -SkipHttpErrorCheck
```

Pass:

| Route | Erwartung |
|---|---|
| `/` | 200 |
| `/api/health` | 200 |
| `/api/messages` | 503 Closed-Pilot |

## Stopps

Wenn 176 fehlschlaegt:

- Keine 177 hinterherschieben.
- Fehler dokumentieren.
- Kein Rollback ohne separaten Founder-Go.

Wenn 177 fehlschlaegt:

- Keine manuellen Feature-Flag-Inserts improvisieren.
- Read-only pruefen, welche der drei Flags eventuell angelegt wurden.
- Fehler dokumentieren.

Wenn nach 177 irgendeines der Schutzflags `enabled=true` ist:

- Stoppen.
- Keine echten Familien einladen.
- Founder-Entscheidung fuer Korrektur einholen.

## Nach erfolgreichem Apply

Dokumentieren:

- Zeitpunkt
- Go-Satz
- Apply-Pfad
- Ergebnis der read-only SQL-Checks
- Ergebnis des App-Smokes
- ob 176/177 in `schema_migrations` sichtbar sind

INBOX aktualisieren:

- Neuer Eintrag fuer `Migration 176/177 Prod-Apply` mit Status `done` oder
  `blocked`.
