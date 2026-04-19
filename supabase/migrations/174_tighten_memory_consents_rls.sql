-- Migration 174: Tighten user_memory_consents RLS — Caregiver SELECT only.
-- Codex-Review BLOCKER F6.2 (docs/plans/2026-04-19-codex-review-welle-c-c3-c6a.md):
--
-- Mig 122 (122_senior_memory_layer.sql:153) hat caregiver_consents als FOR ALL
-- definiert: jeder aktive Caregiver konnte Memory-Consents (memory_basis,
-- memory_care, memory_personal) eines Seniors GRANT/REVOKE/UPDATE/DELETE.
-- Das ist fuer Consent-Daten zu weit — Einwilligung muss vom Senior selbst
-- kommen, nicht delegierbar via Pflege-Link.
--
-- Diese Migration ersetzt die FOR ALL Policy durch FOR SELECT. Schreibrechte
-- haben Caregiver nicht mehr. Mutationen muessen ueber die existierenden
-- API-Routen (/api/memory/consent/grant + /api/memory/consent/revoke)
-- laufen, die ihrerseits jetzt caregiver-on-behalf-of-senior ablehnen
-- (siehe parallel-Commit B fuer die Route-Aenderung).
--
-- Idempotent: ja (drop + create).
-- Rueckbau: 174_tighten_memory_consents_rls.down.sql

begin;

-- Alte FOR ALL Policy entfernen
drop policy if exists "caregiver_consents" on public.user_memory_consents;

-- Neue FOR SELECT Policy: Caregiver darf Consent-Status sehen, aber nicht aendern
create policy "caregiver_consents_select"
  on public.user_memory_consents
  for select
  using (
    exists (
      select 1
      from public.caregiver_links
      where resident_id = user_memory_consents.user_id
        and caregiver_id = auth.uid()
        and revoked_at is null
    )
  );

-- Audit-Comment fuer DSGVO-Doku
comment on policy "caregiver_consents_select" on public.user_memory_consents is
  'Caregiver darf Memory-Consent-Status lesen, aber NICHT aendern. Mutationen '
  'muessen vom Senior selbst kommen (Art. 7 DSGVO Einwilligung ist hoechst-'
  'persoenlich). Vorgaenger-Policy "caregiver_consents" (Mig 122, FOR ALL) '
  'wurde durch Mig 174 ersetzt nach Codex-Review-Befund F6.2.';

commit;
