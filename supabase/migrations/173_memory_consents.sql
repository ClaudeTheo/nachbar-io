-- Migration 173: Memory-Consents + AI-Onboarding Consent
-- Kontext: Welle C (KI + Senior-Memory). Senior-App Stufe 1 Implementation Plan.
--
-- Zwei Aenderungen:
-- 1. care_consents (Mig 108) bekommt neuen Feature-Key 'ai_onboarding' fuer
--    DSGVO Art. 6 + 28 Consent zur KI-Datenuebermittlung (Claude/Mistral).
-- 2. Dokumentations-Comments auf care_consents + user_memory_consents,
--    damit klar ist welcher Consent-Key in welcher Tabelle wohnt.
--
-- user_memory_consents (Mig 122) bleibt Single-Source-of-Truth fuer
-- Memory-Consents (memory_basis, memory_care, memory_personal). Keine
-- neue Tabelle, keine Spaltenaenderung dort.
--
-- Rueckbau: 173_memory_consents.down.sql
-- Idempotent: ja (drop if exists + add constraint, comments sind idempotent)

begin;

-- 1. care_consents.feature CHECK-Constraint erweitern
alter table public.care_consents
  drop constraint if exists care_consents_feature_check;

alter table public.care_consents
  add constraint care_consents_feature_check
  check (feature in (
    'sos',
    'checkin',
    'medications',
    'care_profile',
    'emergency_contacts',
    'ai_onboarding'
  ));

-- 2. Dokumentations-Comments (idempotent)
comment on table public.care_consents is
  'DSGVO-Consent-Log (Feature-Level). Feature-Keys: sos, checkin, medications, '
  'care_profile, emergency_contacts, ai_onboarding. Memory-spezifische Consents '
  '(memory_basis, memory_care, memory_personal) liegen in user_memory_consents '
  '(Mig 122), nicht hier.';

comment on table public.user_memory_consents is
  'DSGVO-Consent-Log fuer KI-Memory (Mig 122). Keys via ENUM memory_consent_type: '
  'memory_basis, memory_care, memory_personal. Feature-Consents (sos, ai_onboarding, '
  'usw.) liegen in care_consents, nicht hier.';

commit;
