-- Down 175: Hausverwaltungs-Fundament zurueckbauen
-- Entfernt Schatten-Quartier und Kommentare.
-- Achtung: Wenn bereits Bewohner dem Schatten-Quartier zugeordnet sind,
-- schlaegt der DELETE fehl (FK-Kette household_members -> households).
-- In dem Fall muss erst ein Prod-Migrations-Plan fuer Betroffene her.

begin;

delete from public.quarters
  where id = '00000000-0000-0000-0000-000000000001';

comment on table public.quarters is null;
comment on column public.civic_organizations.type is null;
comment on column public.organizations.org_type is null;

commit;
