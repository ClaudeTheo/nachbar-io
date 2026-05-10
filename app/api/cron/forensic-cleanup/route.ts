// app/api/cron/forensic-cleanup/route.ts
// Nachbar.io — Loescht abgelaufene Forensik-Daten (7-Tage-Retention)
// Vercel Cron: taeglich 4:00 Uhr

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { cleanupExpiredForensics } from "@/lib/security/forensic-storage";

export const GET = withCronHeartbeat("forensic_cleanup", async () => {
  const deletedCount = await cleanupExpiredForensics();
  return {
    success: true,
    deleted: deletedCount,
    timestamp: new Date().toISOString(),
  };
});
