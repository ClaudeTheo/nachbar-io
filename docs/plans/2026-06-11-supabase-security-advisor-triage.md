# Supabase Security Advisor Triage - 2026-06-11

## Scope

Read-only triage for project `uylszchlyhbpbmslcnka` after the
`spatial_ref_sys` PostGIS issue was closed by Supabase Support.

No production database write, migration apply, secret read, billing action, or
deploy was performed in this branch.

## Current advisor inventory

Source: Supabase MCP read-only SQL + Security Advisor, 2026-06-11.

| Class | Count | Initial handling |
|---|---:|---|
| `security_definer_view` | 1 | Fixed locally in this branch |
| `function_search_path_mutable` | 29 | Needs a separate function-by-function wave |
| security definer functions executable by `anon`/`authenticated` | 42 | Needs separate RPC/RLS/trigger classification |
| RLS enabled, no policy | 2 | Likely intentional deny-all tables; verify by ownership/use |
| permissive write policies | 36 | Needs policy intent review; many look service/admin-oriented |
| Auth leaked-password / MFA warnings | 2 | Dashboard/Auth configuration, not a SQL migration |

## Fix in this branch

`public.quarter_collection_areas` was the only Advisor `ERROR` class item:

- Advisor key: `security_definer_view_public_quarter_collection_areas`
- View definition joins `quarters`, `waste_collection_areas`, and
  `waste_source_registry`
- App reads it from:
  - `app/(app)/waste-calendar/page.tsx`
  - `modules/waste/services/waste-reminder.service.ts`
  - `modules/voice/services/context-loader.ts`
  - `modules/voice/services/tool-executor.ts`

Migration:

- `supabase/migrations/199_quarter_collection_areas_security_invoker.sql`
- Sets only the existing view option:
  `ALTER VIEW public.quarter_collection_areas SET (security_invoker = true)`
- Rollback:
  `supabase/rollbacks/199_quarter_collection_areas_security_invoker.down.sql`

Rationale: Supabase/Postgres views run with security-definer behavior by
default. On Postgres 15+, `security_invoker = true` makes the view obey the
caller's permissions and RLS on underlying tables.

## Mini-Audit

Mini-Audit 2026-06-11:

- RLS/Trigger checked: `quarters`, `waste_collection_areas`,
  `waste_source_registry`, `quarter_collection_areas`
- Findings: no new table write path; the view change reduces privilege by
  removing default security-definer behavior
- Audit-Trail: n/a (read-only view option) | Rate-Limit: n/a

## Follow-up waves

### Wave B - `SECURITY DEFINER` functions

Do not run a blanket revoke. The 42 exposed definer functions include a mix of:

- RLS helper functions
- trigger functions
- likely intended RPC functions
- maintenance/cleanup helpers

Safe workflow:

1. Classify each function as `RLS helper`, `trigger-only`, `RPC intended`,
   `service-only`, or `legacy/unused`.
2. For trigger-only/service-only functions, revoke `EXECUTE` from
   `anon`/`authenticated`.
3. For RLS helpers, keep callable only if needed and schema-qualified in
   policies.
4. For intended RPCs, add explicit tests and keep narrowly scoped behavior.

### Wave C - `search_path` hardening

29 functions have no explicit `search_path`. Supabase recommends pinning the
function search path, ideally to an empty path with fully-qualified references.

Do not auto-set all functions in one migration without testing, because some
functions use unqualified public tables and PostGIS helpers. A safe first pass is
to harden the most exposed `SECURITY DEFINER` functions after their bodies are
reviewed.

### Wave D - permissive write policies

36 policies contain `USING (true)` or `WITH CHECK (true)` for write/all
commands. Some are explicitly `service_role`, but several show role `{public}`
and must be inspected against explicit grants and application access paths.

### Wave E - Auth configuration

The remaining Auth warnings are dashboard configuration:

- Leaked password protection disabled
- Insufficient MFA options

These are not fixed by a migration and need Founder/Product decision for pilot
Auth policy.
