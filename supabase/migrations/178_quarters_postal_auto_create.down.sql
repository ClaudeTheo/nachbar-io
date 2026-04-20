-- Down 178
begin;

drop index if exists public.idx_quarters_postal_auto_unique;

alter table public.quarters drop column if exists scope;
alter table public.quarters drop column if exists auto_created;

commit;
