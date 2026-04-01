// API-Route: Kiosk-Login via QR-Code oder PIN
// POST /api/kiosk/login
// Body: { method: "qr_poll", session_id: string } — Prüft ob QR-Code gescannt wurde
// Body: { method: "pin", pin: string } — PIN-Validierung
// GET /api/kiosk/login?action=create_session — Erzeugt neue Session-ID fuer QR-Code

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Einfacher In-Memory Store fuer Kiosk-Sessions (Produktion: Redis/DB)
const kioskSessions = new Map<
  string,
  {
    created: number;
    user_id?: string;
    display_name?: string;
    status: "pending" | "confirmed" | "expired";
  }
>();

// Aufräumen: Sessions älter als 5 Minuten entfernen
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of kioskSessions) {
    if (now - session.created > 5 * 60 * 1000) {
      kioskSessions.delete(id);
    }
  }
}

// GET: Neue Session erzeugen fuer QR-Code
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  if (action === "create_session") {
    cleanupSessions();
    // Zufällige Session-ID
    const sessionId = crypto.randomUUID();
    kioskSessions.set(sessionId, { created: Date.now(), status: "pending" });

    // URL die im QR-Code steckt — öffnet die App auf dem Handy
    const baseUrl = request.nextUrl.origin;
    const confirmUrl = `${baseUrl}/kiosk/confirm?session=${sessionId}`;

    return NextResponse.json({
      session_id: sessionId,
      qr_url: confirmUrl,
      expires_in: 300, // 5 Minuten
    });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

// POST: Login prüfen (QR-Poll oder PIN)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // QR-Code Poll: Prüft ob Handy die Session bestätigt hat
    if (body.method === "qr_poll" && body.session_id) {
      const session = kioskSessions.get(body.session_id);
      if (!session) {
        return NextResponse.json({ status: "expired" });
      }
      if (session.status === "confirmed" && session.user_id) {
        // Session einmalig abrufen, dann löschen (Sicherheit)
        const userId = session.user_id;
        const displayName = session.display_name;
        kioskSessions.delete(body.session_id);
        return NextResponse.json({
          status: "confirmed",
          user_id: userId,
          display_name: displayName || "Bewohner",
        });
      }
      return NextResponse.json({ status: "pending" });
    }

    // QR-Code Bestätigung: Handy hat gescannt und bestätigt
    if (body.method === "qr_confirm" && body.session_id) {
      const session = kioskSessions.get(body.session_id);
      if (!session) {
        return NextResponse.json(
          { error: "Session abgelaufen" },
          { status: 410 },
        );
      }
      // User-ID aus dem Auth-Header (Handy ist eingeloggt)
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "Nicht angemeldet" },
          { status: 401 },
        );
      }

      // Display-Name aus Profil laden
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      session.status = "confirmed";
      session.user_id = user.id;
      session.display_name = profile?.display_name || user.email?.split("@")[0] || "Bewohner";

      return NextResponse.json({
        status: "confirmed",
        message: "Kiosk wurde angemeldet.",
      });
    }

    // PIN-Login: 4-stellige PIN prüfen
    if (body.method === "pin" && body.pin) {
      const supabase = await createClient();
      // PIN in user_metadata gespeichert (z.B. bei Profil-Einstellungen gesetzt)
      // Fuer Demo: PIN "1234" akzeptieren
      if (body.pin === "1234") {
        return NextResponse.json({
          status: "confirmed",
          user_id: "demo-user",
          message: "PIN akzeptiert (Demo-Modus)",
        });
      }

      // Produktion: PIN gegen Datenbank prüfen
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("kiosk_pin", body.pin)
        .limit(1);

      if (profiles && profiles.length > 0) {
        return NextResponse.json({
          status: "confirmed",
          user_id: profiles[0].id,
          display_name: profiles[0].display_name,
        });
      }

      return NextResponse.json({ status: "invalid", message: "Falsche PIN" });
    }

    return NextResponse.json({ error: "Unbekannte Methode" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Fehler bei der Anmeldung" },
      { status: 500 },
    );
  }
}
