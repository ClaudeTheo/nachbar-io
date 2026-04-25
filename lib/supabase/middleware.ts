// Nachbar.io — Supabase Middleware für Session-Refresh
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildClosedPilotApiBody,
  CLOSED_PILOT_ROBOTS_HEADER,
  isClosedPilotMode,
  isClosedPilotPublicApiPath,
} from "@/lib/closed-pilot";

const APPROVED_CLOSED_PILOT_TRUST_LEVELS = new Set([
  "verified",
  "trusted",
  "lotse",
  "admin",
]);

function hasClosedPilotApproval(profile: {
  trust_level?: string | null;
  settings?: unknown;
} | null) {
  if (!profile) return false;
  const settings =
    profile.settings && typeof profile.settings === "object"
      ? (profile.settings as { pilot_approval_status?: string })
      : {};

  if (settings.pilot_approval_status === "pending") return false;
  if (settings.pilot_approval_status === "blocked") return false;
  if (settings.pilot_approval_status === "approved") return true;

  return APPROVED_CLOSED_PILOT_TRUST_LEVELS.has(profile.trust_level ?? "");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Nur im Development-Modus ohne Supabase-URL: Auth ueberspringen
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (process.env.NODE_ENV === "development" && !supabaseUrl) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Session refreshen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nicht eingeloggte Nutzer zu Login umleiten (außer Auth-Seiten und API)
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/verify") ||
    request.nextUrl.pathname.startsWith("/auth/callback");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isRootPage = request.nextUrl.pathname === "/";
  // Rechtliche Seiten muessen IMMER oeffentlich zugaenglich sein (DSGVO / TMG / BFSG)
  const isLegalPage =
    request.nextUrl.pathname.startsWith("/datenschutz") ||
    request.nextUrl.pathname.startsWith("/impressum") ||
    request.nextUrl.pathname.startsWith("/agb") ||
    request.nextUrl.pathname.startsWith("/barrierefreiheit");
  // Oeffentliche Seiten: Testanleitung, Onboarding-Anleitung, B2B-Landingpage, Store-Pflichtseiten
  const isPublicPage =
    request.nextUrl.pathname.startsWith("/testanleitung") ||
    request.nextUrl.pathname.startsWith("/onboarding-anleitung") ||
    request.nextUrl.pathname.startsWith("/b2b") ||
    request.nextUrl.pathname.startsWith("/account-loeschen") ||
    request.nextUrl.pathname.startsWith("/support") ||
    request.nextUrl.pathname.startsWith("/richtlinien");
  const isPendingApprovalPage =
    request.nextUrl.pathname.startsWith("/freigabe-ausstehend");
  const isClosedPilotPublicApi =
    isApiRoute && isClosedPilotPublicApiPath(request.nextUrl.pathname);
  // Terminal-Seite authentifiziert sich ueber Token in der URL, nicht ueber Session
  const isTerminalPage = request.nextUrl.pathname.startsWith("/terminal");
  // Jugend-Freigabe: Oeffentliche Elternfreigabe-Seiten (via SMS-Token, kein Login)
  const isYouthConsentPage =
    request.nextUrl.pathname.startsWith("/jugend/freigabe");
  // Kiosk: Eigenes Auth-System (QR-Code, PIN, Gast-Modus) — keine Supabase-Session noetig
  const isKioskPage = request.nextUrl.pathname.startsWith("/kiosk");

  if (!user && isClosedPilotMode() && isApiRoute && !isClosedPilotPublicApi) {
    return NextResponse.json(buildClosedPilotApiBody(), {
      status: 503,
      headers: {
        "Retry-After": "3600",
        "X-Robots-Tag": CLOSED_PILOT_ROBOTS_HEADER,
      },
    });
  }

  if (
    !user &&
    !isAuthPage &&
    !isApiRoute &&
    !isRootPage &&
    !isLegalPage &&
    !isPublicPage &&
    !isPendingApprovalPage &&
    !isTerminalPage &&
    !isYouthConsentPage &&
    !isKioskPage
  ) {
    const url = request.nextUrl.clone();
    url.pathname = isClosedPilotMode() ? "/" : "/login";
    const response = NextResponse.redirect(url);
    if (isClosedPilotMode()) {
      response.headers.set("X-Robots-Tag", CLOSED_PILOT_ROBOTS_HEADER);
    }
    return response;
  }

  if (
    user &&
    isClosedPilotMode() &&
    !isClosedPilotPublicApi &&
    !isAuthPage &&
    !isRootPage &&
    !isLegalPage &&
    !isPublicPage &&
    !isPendingApprovalPage &&
    !isTerminalPage &&
    !isYouthConsentPage &&
    !isKioskPage
  ) {
    const { data: profile } = await supabase
      .from("users")
      .select("trust_level, settings")
      .eq("id", user.id)
      .single();

    if (!hasClosedPilotApproval(profile)) {
      if (isApiRoute) {
        return NextResponse.json(
          {
            error:
              "Ihr Konto wartet noch auf Freigabe fuer den geschlossenen Pilot.",
            status: "pilot_approval_pending",
          },
          { status: 403 },
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = "/freigabe-ausstehend";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
