begin;

drop index if exists public.emergency_profiles_pdf_token_hash_idx;

alter table public.emergency_profiles
  drop column if exists pdf_token_hash;

comment on column public.emergency_profiles.pdf_token is
  'Temporärer Klartext-Token fuer Notfallmappe-PDF-/QR-Zugriff. Legacy vor Mig 187.';

commit;
