// app/api/care/cron/shopping/route.ts
// Nachbar.io — Shopping-Erinnerungs-Cron (Vercel Cron: jede Stunde)

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runShoppingCron } from "@/modules/care/services/cron-shopping.service";

export const GET = withCronHeartbeat("shopping_match", async (supabase) => {
  return await runShoppingCron(supabase);
});
