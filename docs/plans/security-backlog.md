# Security Backlog

Stand: 2026-05-27
Owner: Codex / Claude
Zweck: Zentrale Liste fuer Security-Findings, die nicht sofort in derselben Welle gefixt werden. Detaillierte Wellen-Backlogs koennen eigene Datumsdateien haben, diese Datei bleibt der Einstiegspunkt.

## Regel: Disabled RLS

Jedes `DISABLE ROW LEVEL SECURITY` ohne direktes Re-Enable in derselben Welle muss hier eingetragen werden.

Aktueller Codebase-Check:

```powershell
rg -n "DISABLE ROW LEVEL SECURITY" supabase -g "*.sql"
```

Ergebnis am 2026-05-27:

| Status | Tabelle | Quelle | Bewertung |
|---|---|---|---|
| Erledigt | `public.group_members` | `supabase/migrations/161_chat_foundation.sql:532` | Historische RLS-Luecke aus Mig 161. Gefixt durch `20260527183000_enable_rls_group_members.sql`; Prod am 2026-05-27 angewendet und verifiziert. |

Offene `DISABLE ROW LEVEL SECURITY`-Findings: keine.

## Erledigt

| Datum | ID | Severity | Thema | Abschluss |
|---|---|---|---|---|
| 2026-05-27 | RLS-GROUP-MEMBERS | CRITICAL | `public.group_members` ohne RLS nach Mig 161 | PR #15 gemerged. Prod verifiziert: RLS aktiv, 4 Policies, `anon` ohne Grants, `authenticated` nur `SELECT`, `INSERT`, `UPDATE`. |
| 2026-05-27 | RLS-INTEREST-GROUPS | HIGH | Historische Interest-Groups-Policies/Grants zu breit bzw. driftend | PR #15 gemerged. `groups`, `group_posts`, `group_post_comments`, `group_notification_settings` mit RLS/Policies/Grants wiederhergestellt und Prod verifiziert. |
| 2026-05-28 | SECRET-SCAN-HOOK | MEDIUM | Pre-Commit-Schutz gegen versehentlich gestagte Secrets | `.githooks/pre-commit` mit `gitleaks protect --staged` plus `npm run hooks:install` ergaenzt; `vitest.setup.ts` setzt nur fehlende Dummy-Test-ENV-Werte. |

## Offen

Siehe Detail-Backlog `docs/plans/2026-05-15-security-backlog-nach-pass63-audit.md` fuer Family-Setup/Admin/YOUTH-Findings aus Pass 63.

Aktuell kein offenes Disabled-RLS-Finding.
