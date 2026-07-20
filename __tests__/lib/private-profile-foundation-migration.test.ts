import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

function readSql(...segments: string[]): string {
  const path = join(process.cwd(), ...segments);
  return existsSync(path) ? readFileSync(path, "utf8").toLowerCase() : "";
}

const SQL = readSql(
  "supabase",
  "migrations",
  "204_private_profile_foundation.sql",
);
const ROLLBACK = readSql(
  "supabase",
  "rollbacks",
  "204_private_profile_foundation.down.sql",
);
const LOCAL_ROLE_SEED = readSql(
  "supabase",
  "seeds",
  "00-role-grants.sql",
);

describe("204_private_profile_foundation migration", () => {
  it("legt die teilbare Minimalprojektion an und synchronisiert sie aus users", () => {
    expect(SQL).toContain("create table if not exists public.user_public_profiles");
    expect(SQL).toMatch(/user_id uuid primary key[\s\S]*references public\.users\s*\(id\)/);
    expect(SQL).toContain("display_name text");
    expect(SQL).toContain("avatar_url text");
    expect(SQL).toMatch(/insert into public\.user_public_profiles[\s\S]*select[\s\S]*from public\.users/);
    expect(SQL).toContain("create trigger trg_sync_user_public_profile");
    expect(SQL).toContain("after insert or update of display_name, avatar_url");
  });

  it("erlaubt Profile nur der eigenen Person oder ausdruecklichen Beziehungen", () => {
    expect(SQL).toContain("alter table public.user_public_profiles enable row level security");
    expect(SQL).toContain("create policy user_public_profiles_relationship_select");
    expect(SQL).toContain("requester_id");
    expect(SQL).toContain("addressee_id");
    expect(SQL).toContain("status = 'accepted'");
    expect(SQL).toContain("family_child_links");
    expect(SQL).toContain("caregiver_links");
    expect(SQL).toContain("revoked_at is null");
    expect(SQL).not.toContain("is_same_quarter_user");
  });

  it("legt Discovery mit opaker ID und owner-only RLS an", () => {
    expect(SQL).toContain("create table if not exists public.discovery_profiles");
    expect(SQL).toMatch(/id uuid primary key default gen_random_uuid\(\)/);
    expect(SQL).toMatch(/user_id uuid not null unique/);
    expect(SQL).toContain("discoverable boolean not null default false");
    expect(SQL).toMatch(/check \(intro_text is null or char_length\(intro_text\) <= 140\)/);
    expect(SQL).toContain("create policy discovery_profiles_owner_select");
    expect(SQL).toContain("create policy discovery_profiles_owner_insert");
    expect(SQL).toContain("create policy discovery_profiles_owner_update");
    expect(SQL).toContain("create policy discovery_profiles_owner_delete");
    expect(SQL).not.toMatch(/create (or replace )?function[^;]*(search|discover)[^;]*discovery_profiles/);
  });

  it("macht user_id und adult_attested_at fuer Browser-Clients nicht beschreibbar", () => {
    expect(SQL).toContain("create trigger trg_protect_discovery_profile_fields");
    expect(SQL).toContain("new.adult_attested_at := old.adult_attested_at");
    expect(SQL).toContain("new.adult_attested_at := null");
    expect(SQL).toContain("not discoverable or adult_attested_at is not null");
    expect(SQL).toMatch(/grant insert \([^)]*intro_text[^)]*\) on public\.discovery_profiles to authenticated/);
    expect(SQL).toMatch(/grant update \([^)]*intro_text[^)]*\) on public\.discovery_profiles to authenticated/);
    expect(SQL).not.toMatch(/grant (insert|update) \([^)]*(user_id|adult_attested_at)[^)]*\)/);
  });

  it("exponiert beide Tabellen explizit und nur mit minimalen Rechten", () => {
    expect(SQL).toContain("grant select on public.user_public_profiles to authenticated");
    expect(SQL).toContain("revoke all on public.user_public_profiles from anon");
    expect(SQL).toContain("revoke all on public.discovery_profiles from anon");
    expect(SQL).toMatch(/grant select \([^)]*id[^)]*intro_text[^)]*\) on public\.discovery_profiles to authenticated/);
    expect(SQL).not.toContain("grant select on public.discovery_profiles to authenticated");
  });

  it("stellt die Spaltenrechte nach dem lokalen Pauschal-Grant wieder her", () => {
    expect(LOCAL_ROLE_SEED).toContain(
      "revoke all on table public.user_public_profiles from anon, authenticated",
    );
    expect(LOCAL_ROLE_SEED).toContain(
      "revoke all on table public.discovery_profiles from anon, authenticated",
    );
    expect(LOCAL_ROLE_SEED).toMatch(
      /grant select \([^)]*intro_text[^)]*\) on table public\.discovery_profiles to authenticated/,
    );
    expect(LOCAL_ROLE_SEED).not.toMatch(
      /grant (insert|update) \([^)]*(user_id|adult_attested_at)[^)]*\)\s+on table public\.discovery_profiles to authenticated/,
    );
  });

  it("liefert einen atomaren Rollback fuer Tabellen, Trigger und Helper", () => {
    expect(SQL).toContain("begin;");
    expect(SQL).toContain("commit;");
    expect(ROLLBACK).toContain("begin;");
    expect(ROLLBACK).toContain("drop table if exists public.discovery_profiles");
    expect(ROLLBACK).toContain("drop table if exists public.user_public_profiles");
    expect(ROLLBACK).toContain("drop function if exists public.sync_user_public_profile()");
    expect(ROLLBACK).toContain("commit;");
  });
});
