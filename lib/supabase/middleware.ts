// Nachbar.io — Supabase Middleware für Session-Refresh
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    request.nextUrl.pathname.startsWith("/richtlinien") ||
    request.nextUrl.pathname.startsWith("/einladung");
  // Terminal-Seite authentifiziert sich ueber Token in der URL, nicht ueber Session
  const isTerminalPage = request.nextUrl.pathname.startsWith("/terminal");
  // Jugend-Freigabe: Oeffentliche Elternfreigabe-Seiten (via SMS-Token, kein Login)
  const isYouthConsentPage =
    request.nextUrl.pathname.startsWith("/jugend/freigabe");
  // Kiosk: Eigenes Auth-System (QR-Code, PIN, Gast-Modus) — keine Supabase-Session noetig
  const isKioskPage = request.nextUrl.pathname.startsWith("/kiosk");

  if (
    !user &&
    !isAuthPage &&
    !isApiRoute &&
    !isRootPage &&
    !isLegalPage &&
    !isPublicPage &&
    !isTerminalPage &&
    !isYouthConsentPage &&
    !isKioskPage
  ) {
    const url = request.nextUrl.clone();
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
