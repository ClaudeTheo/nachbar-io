-- Rueckbau Migration 174: Stellt die FOR ALL-Policy aus Mig 122 wieder her.
-- Achtung: macht den Privacy-Befund F6.2 wieder auf — nur fuer Notfall-Rollback,
-- nicht fuer Routine-Use.

begin;

drop policy if exists "caregiver_consents_select" on public.user_memory_consents;

create policy "caregiver_consents"
  on public.user_memory_consents
  for all
  using (
    exists (
      select 1
      from public.caregiver_links
      where resident_id = user_memory_consents.user_id
        and caregiver_id = auth.uid()
        and revoked_at is null
    )
  );

commit;
