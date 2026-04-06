// lib/security/security-middleware.ts
// Middleware-Integration: Score pruefen, Stufe entscheiden, Reaktion ausfuehren
// Erkennt auch Honeypot-Pfade (/.env, /wp-admin etc.) vor dem Next.js-Router

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildClientKeys } from "./client-key";
import {
  getScores,
  recordEvent,
  checkFingerprintStability,
  checkSessionDeviceDrift,
} from "./risk-scorer";
import { logSecurityEvent } from "./security-logger";
import { logForensicData } from "./forensic-logger";
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

// Klartext-IP extrahieren (fuer Forensik-Log, BEVOR sie gehasht wird)
function extractRawIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0].trim() || realIp || "unknown";
}

// Forensik-Log fuer Trap-Treffer (fire-and-forget)
function logForensic(
  request: NextRequest,
  trapType: TrapType,
  status: number,
): void {
  logForensicData({
    ip: extractRawIp(request),
    userAgent: request.headers.get("user-agent"),
    requestUrl: request.nextUrl.pathname + request.nextUrl.search,
    requestMethod: request.method,
    responseStatus: status,
    trapType,
  });
}

/** Hauptfunktion: In Middleware aufrufen fuer jeden API-Request */
export async function checkSecurity(
  request: NextRequest,
): Promise<SecurityCheckResult> {
  // E2E-Bypass: Nur wenn Server-seitiger Secret gesetzt UND Header stimmt
  // SECURITY_E2E_BYPASS wird nur in Test-Umgebungen gesetzt, nicht in Produktion
  const e2eBypass = process.env.SECURITY_E2E_BYPASS;
  if (e2eBypass && request.headers.get("x-nachbar-test-mode") === e2eBypass) {
    return { allowed: true, stage: 0, effectiveScore: 0, rateLimitDivisor: 1 };
  }

  const { pathname } = request.nextUrl;
  const keys = await buildClientKeys(request);

  // Observability: Niedrige Bitmaps loggen (potenzielle Bots)
  // Echte Browser haben typischerweise >= 0x07 (accept+lang+encoding)
  // Nur loggen bei API-Requests (Seiten-Requests haben andere Patterns)
  if (pathname.startsWith("/api/") && keys.headerBitmap < 0x07) {
    console.log(
      `[DEVICE-FP] low-bitmap ip=${keys.ipHash.slice(0, 8)} bitmap=0x${keys.headerBitmap.toString(16).padStart(2, "0")} path=${pathname.split("/").slice(0, 4).join("/")} device=${keys.deviceHash?.slice(0, 8) ?? "none"}`,
    );
  }

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
    logForensic(request, "fake_admin", 404);
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
    if (headerPoints >= 20) logForensic(request, "scanner_header", 200);
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
      logForensic(request, "cron_probe", 401);
    }
  }

  // --- Score laden und Stufe bestimmen ---
  const scores = await getScores(keys);

  // --- Device Fingerprint Stabilitaet + Drift (NUR bei Grundverdacht) ---
  // Shared-IP/NAT-Schutz: FP-Checks laufen NUR wenn bereits ein echtes
  // Trap-Event den Score erhoeht hat (baseScore >= 10). Normale Nutzer
  // hinter gemeinsamer IP/VPN werden nie durch FP-Instabilitaet bestraft.
  // Minimaler Detektions-Delay bei Angreifern (~1-2 Requests).
  if (scores.effectiveScore >= 10) {
    const [fpStability, sessionDrift] = await Promise.all([
      checkFingerprintStability(keys),
      checkSessionDeviceDrift(keys),
    ]);

    // fp_instability NUR auf device (NICHT auf IP → Shared-IP-Schutz)
    if (fpStability.points > 0) {
      await recordEvent(keys, "fp_instability", fpStability.points, ["device"]);
      console.log(
        `[DEVICE-FP] instability ip=${keys.ipHash.slice(0, 8)} unique=${fpStability.uniqueHashes} points=${fpStability.points} bitmap=0x${keys.headerBitmap.toString(16).padStart(2, "0")}`,
      );
    }

    // session_drift auf session + device (Session ist client-spezifisch, kein NAT-Problem)
    if (sessionDrift.points > 0) {
      await recordEvent(keys, "session_drift", sessionDrift.points, [
        "session",
        "device",
      ]);
      console.log(
        `[DEVICE-FP] drift session=${keys.sessionHash?.slice(0, 8) ?? "none"} unique=${sessionDrift.uniqueHashes} points=${sessionDrift.points}`,
      );
    }
  }
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
    logForensic(request, "fake_admin", 403); // Stage-4-Block forensisch dokumentieren
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
    logForensic(request, "fake_admin", 403); // Stage-3-Block forensisch dokumentieren
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
