// app/api/cron/synthetic-smoke/route.ts
// Nachbar.io — Synthetic Smoke Check (Phase 1)
// Vercel Cron: alle 30 Minuten
// Prueft: Heartbeat-Pipeline + 5 kritische Cron-Services

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { recordHeartbeat } from "@/lib/services/heartbeat.service";
import { runHeartbeatEscalation } from "@/modules/care/services/heartbeat-escalation.service";
import { runMedicationsCron } from "@/modules/care/services/cron-medications.service";
import { runEscalationCron } from "@/modules/care/services/cron-escalation.service";
import { runWasteSync } from "@/modules/waste";
import { cleanupExpiredForensics } from "@/lib/security/forensic-storage";
import * as Sentry from "@sentry/nextjs";

const SYNTHETIC_USER_EMAIL = "max.rhein@nachbar-test.de";

interface CheckResult {
  name: string;
  ok: boolean | "warn";
  ms: number;
  reason?: string;
}

// Einzelnen Check ausfuehren mit Zeitmessung + Error-Handling
async function runCheck(
  name: string,
  fn: () => Promise<unknown>,
): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - start };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { name, ok: false, ms: Date.now() - start, reason };
  }
}

// GET /api/cron/synthetic-smoke
export async function GET(request: NextRequest) {
  // Cron-Auth (identisch zu allen anderen Cron-Routes)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET nicht konfiguriert" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const checks: CheckResult[] = [];

  // --- Check 1: Heartbeat-Canary ---
  const start1 = Date.now();
  try {
    // Dedizierter Test-User max_rhein
    const { data: { users } } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    const testUser = users.find((u) => u.email === SYNTHETIC_USER_EMAIL);

    if (!testUser) {
      checks.push({
        name: "heartbeat-canary",
        ok: "warn",
        ms: Date.now() - start1,
        reason: `Synthetic test user ${SYNTHETIC_USER_EMAIL} not found`,
      });
    } else {
      await recordHeartbeat(supabase, testUser.id, { source: "synthetic" });
      checks.push({
        name: "heartbeat-canary",
        ok: true,
        ms: Date.now() - start1,
      });
    }
  } catch (err) {
    checks.push({
      name: "heartbeat-canary",
      ok: false,
      ms: Date.now() - start1,
      reason: err instanceof Error ? err.message : String(err),
    });
  }

  // --- Check 2-6: Cron-Smoke ---
  checks.push(
    await runCheck("cron-heartbeat-escalation", () =>
      runHeartbeatEscalation(supabase),
    ),
  );
  checks.push(
    await runCheck("cron-medications", () => runMedicationsCron(supabase)),
  );
  checks.push(
    await runCheck("cron-escalation", () => runEscalationCron(supabase)),
  );
  checks.push(
    await runCheck("cron-waste-sync", () => runWasteSync()),
  );
  checks.push(
    await runCheck("cron-forensic-cleanup", () => cleanupExpiredForensics()),
  );

  // --- Ergebnis auswerten ---
  const passed = checks.filter((c) => c.ok === true).length;
  const warned = checks.filter((c) => c.ok === "warn").length;
  const failed = checks.filter((c) => c.ok === false).length;

  const result = {
    timestamp: new Date().toISOString(),
    passed,
    warned,
    failed,
    total: checks.length,
    checks,
  };

  // Sentry-Reporting
  if (failed > 0) {
    const failedNames = checks
      .filter((c) => c.ok === false)
      .map((c) => `${c.name}: ${c.reason}`)
      .join(", ");
    Sentry.captureMessage(
      `Synthetic Check FAILED (${failed}/${checks.length}): ${failedNames}`,
      "error",
    );
  } else if (warned > 0) {
    const warnNames = checks
      .filter((c) => c.ok === "warn")
      .map((c) => `${c.name}: ${c.reason}`)
      .join(", ");
    Sentry.captureMessage(
      `Synthetic Check DEGRADED (${warned} warnings): ${warnNames}`,
      "warning",
    );
  } else {
    Sentry.addBreadcrumb({
      category: "synthetic",
      message: `All ${checks.length} checks passed`,
      level: "info",
    });
  }

  const status = failed > 0 ? 500 : 200;
  return NextResponse.json(result, { status });
}
