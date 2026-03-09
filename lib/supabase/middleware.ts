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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Session refreshen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nicht eingeloggte Nutzer zu Login umleiten (außer Auth-Seiten und API)
  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/verify");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isRootPage = request.nextUrl.pathname === "/";
  // Rechtliche Seiten muessen IMMER oeffentlich zugaenglich sein (DSGVO / TMG)
  const isLegalPage = request.nextUrl.pathname.startsWith("/datenschutz") ||
    request.nextUrl.pathname.startsWith("/impressum");

  if (!user && !isAuthPage && !isApiRoute && !isRootPage && !isLegalPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
