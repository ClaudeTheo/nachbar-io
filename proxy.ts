import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { checkSecurity } from "@/lib/security/security-middleware";
import { recordAuthRateLimit } from "@/lib/security/traps/brute-force";
import { buildClientKeys } from "@/lib/security/client-key";
import { isLegacyRoute } from "@/lib/legacy-routes";
import { getRequiredFlagForRoute } from "@/lib/health-feature-gate";
import { getCachedFlagEnabled } from "@/lib/feature-flags-middleware-cache";
import {
  CLOSED_PILOT_ROBOTS_HEADER,
  isClosedPilotMode,
  isClosedPilotPublicPath,
} from "@/lib/closed-pilot";
import {
  applyContentSecurityPolicy,
  createContentSecurityPolicyContext,
} from "@/lib/security/csp";

// Oeffentliche Seiten: Kein Auth-Check noetig, statisch cachebar
const PUBLIC_PATHS = ["/", "/b2b", "/impressum", "/datenschutz", "/agb"];
const PUBLIC_PATH_PREFIXES = ["/setup/"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const csp = createContentSecurityPolicyContext(request.headers);
  const nextWithCsp = () =>
    NextResponse.next({ request: { headers: csp.requestHeaders } });
  const secure = <T extends Response>(response: T) =>
    applyContentSecurityPolicy(response, csp.policy);

  if (isClosedPilotMode()) {
    if (isClosedPilotPublicPath(pathname)) {
      const response = nextWithCsp();
      response.headers.set("X-Robots-Tag", CLOSED_PILOT_ROBOTS_HEADER);
      return secure(response);
    }

    if (!pathname.startsWith("/api/")) {
      const response = await updateSession(request, csp.requestHeaders);
      response.headers.set("X-Robots-Tag", CLOSED_PILOT_ROBOTS_HEADER);
      return secure(response);
    }
  }

  // Oeffentliche Seiten: Kein Supabase-Session-Check, direkt weiterleiten
  if (isPublicPath(pathname)) {
    return secure(nextWithCsp());
  }

  // Phase I: Gesundheits-Routes flag-gated. Wenn Flag OFF -> Redirect.
  const healthFlag = getRequiredFlagForRoute(pathname);
  if (healthFlag) {
    const enabled = await getCachedFlagEnabled(healthFlag);
    if (!enabled) {
      const url = request.nextUrl.clone();
      url.pathname = "/kreis-start";
      return secure(NextResponse.redirect(url));
    }
    // Flag aktiv: normal weiter (Auth, Rate-Limit etc. laufen durch).
  }

  // Pilot-Positivliste (C1:6): flag-lose, nicht-pilotreife Module sanft auf
  // /dashboard umleiten ("in Vorbereitung", kein 404). Health-Routes oben
  // bleiben bei /kreis-start.
  if (isLegacyRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return secure(NextResponse.redirect(url));
  }

  // Security-Check (Redis-basiert, fail-open)
  const security = await checkSecurity(request);

  // Blockiert? Sofort zurueckgeben (Honeypot-404 oder 403)
  if (!security.allowed && security.response) {
    return secure(security.response);
  }

  // Rate Limiting fuer API-Endpunkte (adaptiv bei Stufe 2+)
  if (pathname.startsWith("/api/")) {
    const clientKey = getClientKey(request);
    const result = checkRateLimit(
      pathname,
      clientKey,
      security.rateLimitDivisor,
    );

    // result === null bedeutet: Route wird uebersprungen (z.B. Cron-Jobs)
    if (result && !result.allowed) {
      // Trap 5: Brute-Force-Eskalation bei 429 auf Auth-Routen
      // NICHT fuer check-invite (eigenes grosszuegiges Rate-Limit, read-only)
      const isAuthRoute =
        pathname.startsWith("/api/auth/") ||
        (pathname.startsWith("/api/register/") &&
          !pathname.includes("check-invite"));
      if (isAuthRoute) {
        const keys = await buildClientKeys(request);
        recordAuthRateLimit(keys).catch(() => {});
      }

      const retryAfterSeconds = Math.ceil(result.resetMs / 1000);

      return secure(
        NextResponse.json(
          {
            error: "Zu viele Anfragen. Bitte warten Sie einen Moment.",
            retryAfter: retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(
                Math.ceil((Date.now() + result.resetMs) / 1000),
              ),
            },
          },
        ),
      );
    }

    // Erlaubt: Weiterleiten an Route-Handler mit Rate-Limit-Headers
    const response = await updateSession(request, csp.requestHeaders);

    // API-Version Header (A02)
    response.headers.set("X-API-Version", "1");

    if (result) {
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set(
        "X-RateLimit-Reset",
        String(Math.ceil((Date.now() + result.resetMs) / 1000)),
      );
    }

    return secure(response);
  }

  // Nicht-API-Routen: Nur Supabase-Session aktualisieren
  return secure(await updateSession(request, csp.requestHeaders));
}

export const config = {
  matcher: [
    // Alle Routen ausser statische Assets und _next. Statische Brand-Assets
    // (Aquarell-Logo + Symbol + Favicons) muessen oeffentlich erreichbar
    // sein, damit die Closed-Pilot-Landing die Aquarell-Hintergrund-Layer
    // laden kann (Next-Image-Loader holt das Bild ueber /brand/...).
    // images/ enthaelt das Hero-Quartier-Foto, das ab Visual-Polish v7
    // Iteration 2 als App-Shell-Hintergrund dient — muss ebenfalls
    // oeffentlich sein, sonst 307-Redirect zum Login.
    "/((?!_next/static|_next/image|favicon.ico|icons/|brand/|images/|manifest.json|sw.js|promo/|robots.txt|sitemap.xml|monitoring).*)",
  ],
};
