import { NextRequest, NextResponse } from "next/server";

/**
 * QR-Code Generator API
 *
 * Generiert einen QR-Code als SVG für einen Invite-Code.
 * Verwendet die Google Charts API (kostenlos, kein API-Key nötig).
 *
 * GET /api/qr?code=PKD001
 * → Redirect zu QR-Code Bild
 *
 * GET /api/qr?code=PKD001&format=url
 * → JSON mit der Registrierungs-URL
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const format = request.nextUrl.searchParams.get("format");

  if (!code) {
    return NextResponse.json({ error: "Parameter 'code' fehlt" }, { status: 400 });
  }

  // Basis-URL für die Registrierung
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nachbar-io.vercel.app";
  const registerUrl = `${baseUrl}/register?invite=${encodeURIComponent(code)}`;

  if (format === "url") {
    return NextResponse.json({ url: registerUrl, code });
  }

  // QR-Code via Google Charts API generieren
  const size = request.nextUrl.searchParams.get("size") || "300";
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(registerUrl)}&choe=UTF-8`;

  // QR-Code Bild holen und weiterleiten
  const response = await fetch(qrUrl);
  const imageBuffer = await response.arrayBuffer();

  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
