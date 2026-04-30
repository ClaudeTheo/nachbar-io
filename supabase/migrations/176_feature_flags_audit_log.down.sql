-- Rollback fuer Migration 176: Feature-Flag-Audit-Log entfernen.

drop trigger if exists feature_flags_audit_log_trigger on public.feature_flags;
drop function if exists public.log_feature_flag_change();
drop policy if exists "Admin reads feature flag audit log"
  on public.feature_flags_audit_log;
drop table if exists public.feature_flags_audit_log;

alter table public.feature_flags
  drop column if exists last_change_reason;
