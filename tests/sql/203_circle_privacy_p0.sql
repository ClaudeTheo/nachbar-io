\set ON_ERROR_STOP on

begin;

-- Deterministische Testdaten: zwei Quartiere, drei Haushalte und vier Nutzer.
insert into public.quarters (
  id,
  name,
  slug,
  center_lat,
  center_lng,
  bounds_sw_lat,
  bounds_sw_lng,
  bounds_ne_lat,
  bounds_ne_lng,
  status
) values
  ('20300000-0000-0000-0000-000000000001', 'P0 Quartier A', 'p0-quartier-a', 47.55, 7.96, 47.54, 7.95, 47.56, 7.97, 'active'),
  ('20300000-0000-0000-0000-000000000002', 'P0 Quartier B', 'p0-quartier-b', 47.65, 8.06, 47.64, 8.05, 47.66, 8.07, 'active');

insert into public.households (
  id,
  street_name,
  house_number,
  lat,
  lng,
  verified,
  invite_code,
  quarter_id
) values
  ('20310000-0000-0000-0000-000000000001', 'Purkersdorfer Straße', '203A', 47.55, 7.96, true, 'P0A00001', '20300000-0000-0000-0000-000000000001'),
  ('20310000-0000-0000-0000-000000000002', 'Sanarystraße', '203B', 47.551, 7.961, true, 'P0A00002', '20300000-0000-0000-0000-000000000001'),
  ('20310000-0000-0000-0000-000000000003', 'Oberer Rebberg', '203C', 47.65, 8.06, true, 'P0B00001', '20300000-0000-0000-0000-000000000002');

insert into auth.users (id) values
  ('20320000-0000-0000-0000-000000000001'),
  ('20320000-0000-0000-0000-000000000002'),
  ('20320000-0000-0000-0000-000000000003'),
  ('20320000-0000-0000-0000-000000000004'),
  ('20320000-0000-0000-0000-000000000005');

insert into public.users (id, email_hash, display_name) values
  ('20320000-0000-0000-0000-000000000001', 'p0-user-a', 'P0 Nutzer A'),
  ('20320000-0000-0000-0000-000000000002', 'p0-user-b', 'P0 Nutzer B'),
  ('20320000-0000-0000-0000-000000000003', 'p0-user-c', 'P0 Nutzer C'),
  ('20320000-0000-0000-0000-000000000004', 'p0-user-d', 'P0 Nutzer D'),
  ('20320000-0000-0000-0000-000000000005', 'p0-user-e', 'P0 Nutzer E');

insert into public.household_members (household_id, user_id) values
  ('20310000-0000-0000-0000-000000000001', '20320000-0000-0000-0000-000000000001'),
  ('20310000-0000-0000-0000-000000000001', '20320000-0000-0000-0000-000000000002'),
  ('20310000-0000-0000-0000-000000000002', '20320000-0000-0000-0000-000000000004'),
  ('20310000-0000-0000-0000-000000000002', '20320000-0000-0000-0000-000000000005'),
  ('20310000-0000-0000-0000-000000000003', '20320000-0000-0000-0000-000000000003');

-- Der Insert-Trigger entfernt verified_at fuer nicht angemeldete Inserts;
-- die Verifikation wird deshalb wie im autorisierten Serverpfad nachgezogen.
update public.household_members
set verified_at = now()
where user_id::text like '20320000-%';

insert into public.contact_links (
  requester_id,
  addressee_id,
  status,
  accepted_at
) values (
  '20320000-0000-0000-0000-000000000001',
  '20320000-0000-0000-0000-000000000004',
  'accepted',
  now()
);

insert into public.vacation_modes (
  user_id,
  start_date,
  end_date,
  note,
  notify_neighbors,
  quarter_id
) values
  ('20320000-0000-0000-0000-000000000001', current_date, current_date + 1, 'Eigene Notiz', true, '20300000-0000-0000-0000-000000000001'),
  ('20320000-0000-0000-0000-000000000004', current_date, current_date + 1, 'Fremde Notiz gleiches Quartier', false, '20300000-0000-0000-0000-000000000001'),
  ('20320000-0000-0000-0000-000000000003', current_date, current_date + 1, 'Fremde Notiz anderes Quartier', true, '20300000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '20320000-0000-0000-0000-000000000001',
  true
);

do $test$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.household_members
  where user_id = '20320000-0000-0000-0000-000000000003';
  if visible_count <> 0 then
    raise exception 'Cross-quarter household_members leak: expected 0, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.household_members
  where user_id = '20320000-0000-0000-0000-000000000005';
  if visible_count <> 0 then
    raise exception 'Unconnected same-quarter household_members leak: expected 0, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.household_members
  where user_id = '20320000-0000-0000-0000-000000000004';
  if visible_count <> 0 then
    raise exception 'Contact household_members leak: expected 0, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.household_members
  where user_id = '20320000-0000-0000-0000-000000000001';
  if visible_count <> 1 then
    raise exception 'Own household_members row regression: expected 1, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.household_members
  where user_id = '20320000-0000-0000-0000-000000000002';
  if visible_count <> 1 then
    raise exception 'Own-household member regression: expected 1, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.household_members
  where household_id = '20310000-0000-0000-0000-000000000001';
  if visible_count <> 2 then
    raise exception 'Own verified household regression: expected 2, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.vacation_modes
  where user_id <> '20320000-0000-0000-0000-000000000001';
  if visible_count <> 0 then
    raise exception 'Foreign vacation_modes leak: expected 0, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.vacation_modes
  where user_id = '20320000-0000-0000-0000-000000000001';
  if visible_count <> 1 then
    raise exception 'Own vacation_modes regression: expected 1, got %', visible_count;
  end if;
end
$test$;

reset role;

do $test$
declare
  default_expression text;
begin
  select column_default into default_expression
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'vacation_modes'
    and column_name = 'notify_neighbors';

  if default_expression is distinct from 'false' then
    raise exception 'notify_neighbors default must be false, got %', default_expression;
  end if;
end
$test$;

rollback;
