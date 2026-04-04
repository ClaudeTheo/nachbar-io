// lib/supabase/admin.ts
// Zentraler Service-Role Client fuer Admin-Operationen (Cron-Jobs, Webhooks, etc.)
// Ersetzt die 14+ duplizierten getAdminSupabase()-Funktionen in den API-Routes

import { createClient } from "@supabase/supabase-js";

/**
 * Erstellt einen Supabase-Client mit Service-Role-Key.
 * Fuer serverseitige Admin-Operationen ohne User-Context.
 * NICHT fuer Client-seitige oder User-bezogene Abfragen verwenden.
 */
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url.trim(), key.trim());
}
