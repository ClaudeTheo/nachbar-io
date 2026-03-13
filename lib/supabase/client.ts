// Nachbar.io — Supabase Browser-Client (Singleton fuer Multi-Tab-Stabilitaet)
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Laengerer Timeout verhindert aggressives Lock-Stealing zwischen Tabs
        lockAcquireTimeout: 15000,
        detectSessionInUrl: true,
      },
    }
  );

  return client;
}
