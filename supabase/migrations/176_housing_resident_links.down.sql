-- Down 176: housing_resident_links zurueckbauen

begin;

drop policy if exists "hrl_select_resident" on public.housing_resident_links;
drop policy if exists "hrl_select_staff" on public.housing_resident_links;
drop policy if exists "hrl_insert_staff" on public.housing_resident_links;
drop policy if exists "hrl_update_staff" on public.housing_resident_links;
drop policy if exists "hrl_admin_all" on public.housing_resident_links;

drop table if exists public.housing_resident_links;

commit;
