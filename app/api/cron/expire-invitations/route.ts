// app/api/cron/expire-invitations/route.ts
// Nachbar.io — Cron: Offene Einladungen nach 30 Tagen automatisch ablaufen lassen
// Vercel Cron: täglich um 3:00 Uhr

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runExpireInvitationsCron } from "@/lib/services/cron-expire-invitations.service";

export const GET = withCronHeartbeat("expire_invitations", async (supabase) => {
  return await runExpireInvitationsCron(supabase);
});
