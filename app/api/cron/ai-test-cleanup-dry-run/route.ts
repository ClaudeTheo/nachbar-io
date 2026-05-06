import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { verifyCronSecret } from "@/lib/security/cron-secret";
import {
  buildAiTestUsersCleanupDryRunReport,
  type DryRunDb,
} from "@/lib/admin/ai-test-users-cleanup-dry-run";

/**
 * GET /api/cron/ai-test-cleanup-dry-run
 *
 * Read-only Audit-Bericht ueber AI-Test-User in der DB.
 * Schreibt nichts, loescht nichts. Schutz: CRON_SECRET via Bearer-Header.
 * Aktivierungs-Trigger: manueller curl, NICHT in vercel.json-Schedule.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !verifyCronSecret(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase() as unknown as DryRunDb;
    const report = await buildAiTestUsersCleanupDryRunReport(supabase);
    return NextResponse.json(report);
  } catch (error) {
    return handleServiceError(error);
  }
}
