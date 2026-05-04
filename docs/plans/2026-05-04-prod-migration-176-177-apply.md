# Prod-Migration 176/177 Apply

Datum: 2026-05-04
Zeitfenster: ca. 19:50-20:00 MESZ
Ausfuehrender Agent: Codex
Founder-Go: `MIGRATION-PROD-GO-176-177`
Claude-Zweitmeinung:
`docs/plans/handoff/2026-05-04-claude-an-codex-mig-176-177-zweitmeinung.md`

## Scope

Erlaubt und ausgefuehrt:

- Migration 176 auf Supabase-Prod anwenden.
- Migration 177 auf Supabase-Prod anwenden.
- Beide Versionen im Supabase-Migrations-Tracking als angewendet markieren.
- Read-only SQL-Checks gemaess Runbook.
- Unauthentifizierter Live-Smoke gegen `https://nachbar-io.vercel.app`.

Nicht ausgefuehrt:

- keine Migration 178
- keine anderen Prod-DB-Schreibaktionen
- keine Vercel-Env-Aenderung
- keine Secrets gelesen oder ausgegeben
- kein Vercel-Deploy
- kein Git-Push
- kein Provider-/Billing-/Twilio-Live-Schalter
- keine echten Pilotdaten durch KI

## Preflight

Runbook:

- `docs/plans/2026-05-04-migration-runbook-176-177.md`

Git:

- Lokaler `HEAD` vor Apply: `bd09938e727ef77f2507149e536fedfec6dfe74d`
- `origin/master`: `0767d08b050ada4b141cf61a2ec3ef536c7f5bc2`
- Abweichung: lokaler Handoff-Commit
  `bd09938 docs(handoff): ask claude next migration step`; reine Doku, kein
  Code-Drift.
- Bekannte alte untracked Handoff-Dateien und `.codex-welle-d-3001.pid`
  blieben unberuehrt.

Production-Deploy:

- `vercel list --format json --status READY --environment production --yes`
  zeigte als neuesten Production-Deploy
  `nachbar-k9ai8lh6w-thomasth1977s-projects.vercel.app`.
- `githubCommitSha`: `acd2e9bd57025a65a39314eb104b30204631f7ab`
- Production-Code ist damit mindestens OWASP-Fix-Stand `acd2e9b`.

Pre-Smoke:

| Route | Ergebnis |
|---|---|
| `/` | 200 |
| `/api/health` | 200, Body `{"status":"ok"}` |
| `/api/messages` | 503, Body enthaelt `closed_pilot` |

Read-only DB vor Apply:

- `schema_migrations`: keine Eintraege fuer `176`, `177`, `178`.
- `feature_flags` enthielt die Basisspalten `key`, `enabled`,
  `required_roles`, `required_plans`, `enabled_quarters`, `description`.
- `feature_flags.last_change_reason` fehlte.
- `public.feature_flags_audit_log` fehlte.
- `public.log_feature_flag_change()` fehlte.
- Trigger `feature_flags_audit_log_trigger` fehlte.
- Optionaler Sanity-Count: `feature_flags` hatte `47` Zeilen.

## Apply-Pfad

Migration 176:

```powershell
npx supabase db query --linked -f "supabase\migrations\176_feature_flags_audit_log.sql"
npx supabase migration repair 176 --status applied --linked --yes
```

Migration 177:

```powershell
npx supabase db query --linked -f "supabase\migrations\177_pilot_phase_flags.sql"
npx supabase migration repair 177 --status applied --linked --yes
```

## Read-only SQL-Checks nach Apply

Migration 176:

- `feature_flags.last_change_reason` existiert als `text`, nullable.
- `public.feature_flags_audit_log` existiert.
- `public.log_feature_flag_change()` existiert.
- Trigger `feature_flags_audit_log_trigger` existiert.
- `feature_flags_audit_log` war direkt nach 176 leer: `audit_rows = 0`.
- Feature-Flag-Count blieb nach 176 unveraendert: `47`.
- `schema_migrations`: `176 / feature_flags_audit_log`.

Migration 177:

- `BILLING_ENABLED` existiert und ist `enabled=false`.
- `TWILIO_ENABLED` existiert und ist `enabled=false`.
- `CHECKIN_MESSAGES_ENABLED` existiert und ist `enabled=false`.
- Feature-Flag-Count nach 177: `50`.
- `feature_flags_audit_log` enthaelt `3` Audit-Zeilen fuer die drei
  Schutzflags.
- Die letzten Audit-Zeilen zeigen je `action="insert"`,
  `enabled_before=null`, `enabled_after=false`, `changed_by=null`,
  `reason=null`. Das ist erwartbar fuer den Migration-Apply-Kontext und
  bestaetigt, dass der 176-Trigger beim 177-Insert feuert.
- `schema_migrations`: `176 / feature_flags_audit_log` und
  `177 / pilot_phase_flags`.
- `178` wurde nicht angewendet.

## Live-Smoke nach Apply

Unauthentifiziert gegen `https://nachbar-io.vercel.app`:

| Route | Ergebnis |
|---|---|
| `/` | 200 |
| `/api/health` | 200, Body `{"status":"ok"}` |
| `/api/messages` | 503, Body enthaelt `closed_pilot` |

## Ergebnis

Migration 176 und 177 wurden am 2026-05-04 unter dem Founder-Go
`MIGRATION-PROD-GO-176-177` auf Supabase-Prod angewendet und im
Migrations-Tracking markiert. Die read-only SQL-Checks und der
unauthentifizierte Live-Smoke sind erfolgreich.

Migration 178 bleibt weiterhin deferred bis zum echten Phase-1-Switch zusammen
mit der ersten Pilot-Familien-Einladung.
