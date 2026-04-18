// Display-Name-Helper fuer Chat-Services.
// Nutzt RPC get_display_names (Mig 167), die serverseitig prueft, ob
// der Aufrufer mit der jeweiligen ID einen accepted contact_link hat
// oder in derselben Chat-Gruppe ist.

import type { SupabaseClient } from "@supabase/supabase-js";

export type DisplayNameMap = Map<string, string>;

export async function fetchDisplayNames(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<DisplayNameMap> {
  const map: DisplayNameMap = new Map();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return map;

  const { data, error } = await supabase.rpc("get_display_names", {
    peer_ids: unique,
  });
  if (error || !data) return map;

  for (const row of data as Array<{
    id: string;
    display_name: string | null;
  }>) {
    if (row.display_name) map.set(row.id, row.display_name);
  }
  return map;
}
