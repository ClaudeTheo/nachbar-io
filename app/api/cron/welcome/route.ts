// app/api/cron/welcome/route.ts
// Nachbar.io — Cron: Willkommenspakete an neue Nutzer (1h nach Registrierung)
// Vercel Cron: alle 30 Minuten

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { findNewUsersForWelcomePack, sendWelcomePack } from "@/lib/welcome-pack";

export const GET = withCronHeartbeat("welcome", async (supabase) => {
  const newUsers = await findNewUsersForWelcomePack(supabase);

  if (newUsers.length === 0) {
    return { message: "Keine neuen Nutzer für Willkommenspaket", count: 0 };
  }

  const results = [];
  for (const user of newUsers) {
    const result = await sendWelcomePack(
      supabase,
      user.id,
      user.quarter_id,
      user.display_name,
    );
    results.push({ userId: user.id, ...result });
  }

  return {
    count: results.filter((r) => r.sent).length,
    results,
  };
});
