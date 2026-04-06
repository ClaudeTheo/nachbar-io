// lib/security/security-middleware.ts
// Middleware-Integration: Score pruefen, Stufe entscheiden, Reaktion ausfuehren
// Erkennt auch Honeypot-Pfade (/.env, /wp-admin etc.) vor dem Next.js-Router

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildClientKeys } from "./client-key";
import { getScores, recordEvent } from "./risk-scorer";
import { logSecurityEvent } from "./security-logger";
import {
  classifyRoute,
  STAGE_THRESHOLDS,
  STAGE2_RATE_DIVISOR,
  HONEYPOT_PATHS,
  SCANNER_USER_AGENTS,
  type TrapType,
} from "./config";

export interface SecurityCheckResult {
  allowed: boolean;
  stage: number;
  effectiveScore: number;
  rateLimitDivisor: number; // 1 = normal, 3 = gedrosselt
  response?: NextResponse; // Nur wenn blockiert
}

/** Hauptfunktion: In Middleware aufrufen fuer jeden API-Request */
export async function checkSecurity(
  request: NextRequest,
): Promise<SecurityCheckResult> {
  const { pathname } = request.nextUrl;
  const keys = await buildClientKeys(request);

  // --- Trap 1: Honeypot-Pfade (vor allem fuer Nicht-API-Pfade wie /.env) ---
  const normalizedPath = pathname.toLowerCase();
  if (
    HONEYPOT_PATHS.some(
      (p) => normalizedPath === p || normalizedPath.startsWith(p + "/"),
    )
  ) {
    await recordEvent(keys, "fake_admin", 40, ["ip", "session"]);
    logSecurityEvent({
      keys,
      trapType: "fake_admin",
      points: 40,
      effectiveScore: 40,
      stage: 2,
      routePattern: pathname,
    });
    // 404 zurueckgeben (identisch mit echten API-404s — mit JSON-Body)
    return {
      allowed: false,
      stage: 2,
      effectiveScore: 40,
      rateLimitDivisor: 1,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  // --- Trap 6: Scanner-Header-Erkennung ---
  const headerPoints = analyzeHeaders(request);
  if (headerPoints > 0) {
    await recordEvent(keys, "scanner_header", headerPoints, ["ip", "session"]);
    logSecurityEvent({
      keys,
      trapType: "scanner_header",
      points: headerPoints,
      effectiveScore: headerPoints,
      stage: headerPoints >= 40 ? 2 : 1,
      routePattern: pathname.split("/").slice(0, 3).join("/") + "/*",
    });
  }

  // --- Trap 7: Cron-Probing (ohne gueltigen Token) ---
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      await recordEvent(keys, "cron_probe", 50, ["ip", "session"]);
      logSecurityEvent({
        keys,
        trapType: "cron_probe",
        points: 50,
        effectiveScore: 50,
        stage: 3,
        routePattern: "/api/cron/*",
      });
      // Cron-Route wird durch bestehende Auth abgefangen → hier nur scoren
    }
  }

  // --- Score laden und Stufe bestimmen ---
  const scores = await getScores(keys);
  const routeCategory = classifyRoute(pathname);
  const thresholds = STAGE_THRESHOLDS[routeCategory];

  // Route-spezifische Stufe (kann hoeher sein als globale Stufe)
  let routeStage = scores.stage;
  if (scores.effectiveScore >= thresholds.stage3)
    routeStage = Math.max(routeStage, 3);
  else if (scores.effectiveScore >= thresholds.stage2)
    routeStage = Math.max(routeStage, 2);

  // --- Reaktion ---
  if (routeStage >= 4) {
    return {
      allowed: false,
      stage: 4,
      effectiveScore: scores.effectiveScore,
      rateLimitDivisor: 1,
      response: NextResponse.json(
        { error: "Zugriff voruebergehend gesperrt" },
        { status: 403 },
      ),
    };
  }

  if (routeStage >= 3 && routeCategory !== "public") {
    return {
      allowed: false,
      stage: 3,
      effectiveScore: scores.effectiveScore,
      rateLimitDivisor: 1,
      response: NextResponse.json(
        { error: "Zugriff voruebergehend gesperrt" },
        { status: 403 },
      ),
    };
  }

  return {
    allowed: true,
    stage: routeStage,
    effectiveScore: scores.effectiveScore,
    rateLimitDivisor: routeStage >= 2 ? STAGE2_RATE_DIVISOR : 1,
  };
}

/** Trap 6: Header-Analyse */
function analyzeHeaders(request: NextRequest): number {
  let points = 0;
  const ua = request.headers.get("user-agent") ?? "";

  // Fehlender/leerer User-Agent
  if (!ua || ua.length < 5) points += 10;

  // Bekannte Scanner-UAs
  const uaLower = ua.toLowerCase();
  if (SCANNER_USER_AGENTS.some((s) => uaLower.includes(s))) points += 40;

  // Fehlender Accept-Header auf Seiten-Requests
  const accept = request.headers.get("accept");
  if (!accept && !request.nextUrl.pathname.startsWith("/api/")) points += 5;

  // Verdaechtige Proxy-Chain (>5 IPs)
  const xff = request.headers.get("x-forwarded-for") ?? "";
  if (xff.split(",").length > 5) points += 10;

  return points;
}
