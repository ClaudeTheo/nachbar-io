-- Migration 186: CareCircle-RLS-Bruecke fuer caregiver_links
-- File-first angelegt. NICHT auf Prod anwenden ohne Founder-Go.
--
-- Problem:
--   App-Services nutzen fuer Angehoerige das neuere caregiver_links-Modell,
--   waehrend alte Care-RLS-Policies ueber is_care_helper_for()/care_helper_role()
--   nur care_helpers kennen. Dadurch kann die App Zugriff erlauben, aber RLS
--   liefert fuer reine caregiver_links-Beziehungen keine Care-Zeilen.
--
-- Ziel:
--   caregiver_links als CareCircle-Master in die bestehenden RLS-Helferfunktionen
--   adaptieren, ohne Policies tabellenweise zu duplizieren.

begin;

create or replace function public.is_care_helper_for(p_senior_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_has_legacy_helper boolean := false;
  v_has_caregiver_link boolean := false;
begin
  if to_regclass('public.care_helpers') is not null then
    select exists (
      select 1
      from public.care_helpers
      where user_id = auth.uid()
        and p_senior_id = any(assigned_seniors)
        and verification_status = 'verified'
    )
    into v_has_legacy_helper;
  end if;

  if v_has_legacy_helper then
    return true;
  end if;

  if to_regclass('public.caregiver_links') is not null then
    select exists (
      select 1
      from public.caregiver_links
      where caregiver_id = auth.uid()
        and resident_id = p_senior_id
        and revoked_at is null
    )
    into v_has_caregiver_link;
  end if;

  return coalesce(v_has_caregiver_link, false);
end;
$$;

create or replace function public.care_helper_role(p_senior_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text;
  v_relationship_type text;
begin
  if to_regclass('public.care_helpers') is not null then
    select role
    into v_role
    from public.care_helpers
    where user_id = auth.uid()
      and p_senior_id = any(assigned_seniors)
      and verification_status = 'verified'
    limit 1;

    if v_role is not null then
      return v_role;
    end if;
  end if;

  if to_regclass('public.caregiver_links') is not null then
    select relationship_type
    into v_relationship_type
    from public.caregiver_links
    where caregiver_id = auth.uid()
      and resident_id = p_senior_id
      and revoked_at is null
    limit 1;

    if v_relationship_type is not null then
      return case
        when v_relationship_type = 'volunteer' then 'neighbor'
        else 'relative'
      end;
    end if;
  end if;

  return null;
end;
$$;

comment on function public.is_care_helper_for(uuid) is
  'RLS-Helferfunktion fuer Care-Zugriff. Mig 186 erweitert Legacy-care_helpers '
  'um aktive caregiver_links, damit CareCircle-Angehoerige konsistent durch '
  'bestehende Care-RLS-Policies lesen koennen.';

comment on function public.care_helper_role(uuid) is
  'RLS-Rollenfunktion fuer Care-Schreibrechte. Legacy-care_helpers hat Vorrang; '
  'caregiver_links werden app-konsistent gemappt: volunteer -> neighbor, alle '
  'anderen Beziehungen -> relative.';

commit;
