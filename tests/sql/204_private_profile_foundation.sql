\set ON_ERROR_STOP on

begin;

insert into public.quarters (
  id, name, slug, center_lat, center_lng,
  bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng, status
) values
  ('20400000-0000-0000-0000-000000000001', 'Profil Quartier A', 'profil-quartier-a', 47.55, 7.96, 47.54, 7.95, 47.56, 7.97, 'active'),
  ('20400000-0000-0000-0000-000000000002', 'Profil Quartier B', 'profil-quartier-b', 47.65, 8.06, 47.64, 8.05, 47.66, 8.07, 'active');

insert into public.households (
  id, street_name, house_number, lat, lng, verified, invite_code, quarter_id
) values
  ('20410000-0000-0000-0000-000000000001', 'Testweg', '204A', 47.55, 7.96, true, 'W3A00001', '20400000-0000-0000-0000-000000000001'),
  ('20410000-0000-0000-0000-000000000002', 'Testweg', '204B', 47.65, 8.06, true, 'W3B00001', '20400000-0000-0000-0000-000000000002');

insert into auth.users (id) values
  ('20420000-0000-0000-0000-000000000001'),
  ('20420000-0000-0000-0000-000000000002'),
  ('20420000-0000-0000-0000-000000000003'),
  ('20420000-0000-0000-0000-000000000004'),
  ('20420000-0000-0000-0000-000000000005'),
  ('20420000-0000-0000-0000-000000000006');

insert into public.users (id, email_hash, display_name, avatar_url) values
  ('20420000-0000-0000-0000-000000000001', 'w3-user-a', 'W3 Nutzer A', 'a.png'),
  ('20420000-0000-0000-0000-000000000002', 'w3-user-b', 'W3 Kontakt B', 'b.png'),
  ('20420000-0000-0000-0000-000000000003', 'w3-user-c', 'W3 Fremd C', 'c.png'),
  ('20420000-0000-0000-0000-000000000004', 'w3-user-d', 'W3 Familie D', 'd.png'),
  ('20420000-0000-0000-0000-000000000005', 'w3-user-e', 'W3 Care E', 'e.png'),
  ('20420000-0000-0000-0000-000000000006', 'w3-user-f', 'W3 Ohne Mitgliedschaft F', 'f.png');

insert into public.household_members (household_id, user_id) values
  ('20410000-0000-0000-0000-000000000001', '20420000-0000-0000-0000-000000000001'),
  ('20410000-0000-0000-0000-000000000001', '20420000-0000-0000-0000-000000000002'),
  ('20410000-0000-0000-0000-000000000001', '20420000-0000-0000-0000-000000000004'),
  ('20410000-0000-0000-0000-000000000001', '20420000-0000-0000-0000-000000000005'),
  ('20410000-0000-0000-0000-000000000002', '20420000-0000-0000-0000-000000000003');

update public.household_members
set verified_at = now()
where user_id::text like '20420000-%';

insert into public.contact_links (requester_id, addressee_id, status, accepted_at)
values (
  '20420000-0000-0000-0000-000000000001',
  '20420000-0000-0000-0000-000000000002',
  'accepted',
  now()
);

insert into public.family_child_links (
  guardian_user_id, child_user_id, household_id, quarter_id,
  relationship_type, status, consent_version
) values (
  '20420000-0000-0000-0000-000000000001',
  '20420000-0000-0000-0000-000000000004',
  '20410000-0000-0000-0000-000000000001',
  '20400000-0000-0000-0000-000000000001',
  'guardian',
  'active',
  'w3-test'
);

insert into public.caregiver_links (
  resident_id, caregiver_id, relationship_type, consent_status
) values (
  '20420000-0000-0000-0000-000000000005',
  '20420000-0000-0000-0000-000000000001',
  'friend',
  'active'
);

insert into public.discovery_profiles (
  user_id, quarter_id, discoverable, intro_text, adult_attested_at
) values (
  '20420000-0000-0000-0000-000000000003',
  '20400000-0000-0000-0000-000000000002',
  true,
  'Serverseitig angelegtes Fremdprofil',
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20420000-0000-0000-0000-000000000001', true);

do $test$
declare
  visible_count integer;
  own_discovery_id uuid;
begin
  select count(*) into visible_count
  from public.user_public_profiles
  where user_id::text like '20420000-%';
  if visible_count <> 4 then
    raise exception 'Profilbeziehungen: erwartet 4 sichtbare Profile, erhalten %', visible_count;
  end if;

  select count(*) into visible_count
  from public.user_public_profiles
  where user_id = '20420000-0000-0000-0000-000000000003';
  if visible_count <> 0 then
    raise exception 'Unverbundenes Cross-Quarter-Profil sichtbar: erwartet 0, erhalten %', visible_count;
  end if;

  select count(*) into visible_count
  from public.discovery_profiles
  where id IN (
    select id from public.discovery_profiles
  );
  if visible_count <> 0 then
    raise exception 'Fremdes Discovery-Profil sichtbar: erwartet 0, erhalten %', visible_count;
  end if;

  begin
    perform user_id from public.discovery_profiles limit 1;
    raise exception 'discovery_profiles.user_id war fuer authenticated lesbar';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.discovery_profiles (quarter_id, intro_text)
    values ('20400000-0000-0000-0000-000000000002', 'Manipuliertes Quartier');
    raise exception 'quarter_id war fuer authenticated beschreibbar';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.discovery_profiles (intro_text, adult_attested_at)
    values ('Client-Attestierung', now());
    raise exception 'adult_attested_at war fuer authenticated beschreibbar';
  exception
    when insufficient_privilege then null;
  end;

  insert into public.discovery_profiles (intro_text)
  values ('Mein privates Discovery-Profil')
  returning id into own_discovery_id;

  select count(*) into visible_count
  from public.discovery_profiles
  where id = own_discovery_id
    and quarter_id = '20400000-0000-0000-0000-000000000001'
    and adult_attested_at is null;
  if visible_count <> 1 then
    raise exception 'Eigenes Discovery-Profil wurde nicht sicher aus Mitgliedschaft abgeleitet';
  end if;

  begin
    update public.discovery_profiles
    set discoverable = true
    where id = own_discovery_id;
    raise exception 'Discovery Opt-in ohne Adult-Attestierung war moeglich';
  exception
    when check_violation then null;
  end;

  begin
    update public.discovery_profiles
    set adult_attested_at = now()
    where id = own_discovery_id;
    raise exception 'adult_attested_at war fuer authenticated aktualisierbar';
  exception
    when insufficient_privilege then null;
  end;
end
$test$;

reset role;
select set_config('request.jwt.claim.sub', '', true);

update public.discovery_profiles
set adult_attested_at = now()
where user_id = '20420000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '20420000-0000-0000-0000-000000000001', true);

update public.discovery_profiles
set discoverable = true,
    intro_text = 'Jetzt freigegeben'
where id IN (
  select id
  from public.discovery_profiles
  where quarter_id = '20400000-0000-0000-0000-000000000001'
);

do $test$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.discovery_profiles
  where discoverable = true
    and adult_attested_at is not null;
  if visible_count <> 1 then
    raise exception 'Server-Attestierung blieb beim Browser-Update nicht erhalten';
  end if;
end
$test$;

reset role;
select set_config('request.jwt.claim.sub', '20420000-0000-0000-0000-000000000006', true);

do $test$
begin
  begin
    insert into public.discovery_profiles (intro_text)
    values ('Ohne verifizierte Mitgliedschaft');
    raise exception 'Discovery-Profil ohne Mitgliedschaft war moeglich';
  exception
    when insufficient_privilege then null;
  end;
end
$test$;

-- GDPR-Regression: Auth-verankerte Consumer duerfen das Loeschen von
-- public.users nicht ueber die additive Profilprojektion blockieren.
select set_config('request.jwt.claim.sub', '', true);

insert into public.help_requests (
  id, user_id, type, category, title, quarter_id
) values (
  '20430000-0000-0000-0000-000000000001',
  '20420000-0000-0000-0000-000000000001',
  'need',
  'other',
  'GDPR Testbeitrag',
  '20400000-0000-0000-0000-000000000001'
);

insert into public.board_comments (post_id, user_id, text) values (
  '20430000-0000-0000-0000-000000000001',
  '20420000-0000-0000-0000-000000000006',
  'GDPR Testkommentar'
);

insert into public.shared_meals (
  id, user_id, quarter_id, type, title, servings, meal_date
) values (
  '20430000-0000-0000-0000-000000000002',
  '20420000-0000-0000-0000-000000000006',
  '20400000-0000-0000-0000-000000000001',
  'portion',
  'GDPR Testessen',
  1,
  current_date
);

insert into public.community_tips (
  id, user_id, category, title, description
) values (
  '20430000-0000-0000-0000-000000000003',
  '20420000-0000-0000-0000-000000000001',
  'other',
  'GDPR Testtipp',
  'Bleibt beim Loeschen des Review-Autors erhalten'
);

insert into public.tip_reviews (tip_id, user_id, rating) values (
  '20430000-0000-0000-0000-000000000003',
  '20420000-0000-0000-0000-000000000006',
  5
);

select public.gdpr_delete_user(
  '20420000-0000-0000-0000-000000000006'
);

do $test$
declare
  remaining_count integer;
begin
  select count(*) into remaining_count
  from public.users
  where id = '20420000-0000-0000-0000-000000000006';
  if remaining_count <> 0 then
    raise exception 'gdpr_delete_user hat public.users nicht geloescht';
  end if;

  select count(*) into remaining_count
  from public.user_public_profiles
  where user_id = '20420000-0000-0000-0000-000000000006';
  if remaining_count <> 1 then
    raise exception 'Profil muss bis zur anschliessenden auth.users-Loeschung bestehen bleiben';
  end if;
end
$test$;

delete from auth.users
where id = '20420000-0000-0000-0000-000000000006';

do $test$
declare
  remaining_count integer;
begin
  select count(*) into remaining_count
  from public.user_public_profiles
  where user_id = '20420000-0000-0000-0000-000000000006';
  if remaining_count <> 0 then
    raise exception 'auth.users-Loeschung hat die Profilprojektion nicht kaskadiert';
  end if;

  select
    (select count(*) from public.board_comments where user_id = '20420000-0000-0000-0000-000000000006')
    + (select count(*) from public.shared_meals where user_id = '20420000-0000-0000-0000-000000000006')
    + (select count(*) from public.tip_reviews where user_id = '20420000-0000-0000-0000-000000000006')
  into remaining_count;
  if remaining_count <> 0 then
    raise exception 'Auth-verankerte GDPR-Consumer wurden nicht geloescht: %', remaining_count;
  end if;
end
$test$;

rollback;
