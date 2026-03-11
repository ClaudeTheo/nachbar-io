import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate Limiting nur fuer API-Endpunkte
  if (pathname.startsWith("/api/")) {
    const clientKey = getClientKey(request);
    const result = checkRateLimit(pathname, clientKey);

    // result === null bedeutet: Route wird uebersprungen (z.B. Cron-Jobs)
    if (result && !result.allowed) {
      const retryAfterSeconds = Math.ceil(result.resetMs / 1000);

      return NextResponse.json(
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
            "X-RateLimit-Reset": String(Math.ceil((Date.now() + result.resetMs) / 1000)),
          },
        }
      );
    }

    // Erlaubt: Weiterleiten an Route-Handler mit Rate-Limit-Headers
    const response = await updateSession(request);

    if (result) {
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set(
        "X-RateLimit-Reset",
        String(Math.ceil((Date.now() + result.resetMs) / 1000))
      );
    }

    return response;
  }

  // Nicht-API-Routen: Nur Supabase-Session aktualisieren
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Alle Routen ausser statische Assets und _next
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)",
  ],
};
