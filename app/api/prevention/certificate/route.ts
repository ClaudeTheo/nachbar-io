// GET/POST /api/prevention/certificate — Teilnahmebescheinigung
// GET: Zertifikat-Daten laden (fuer Vorschau)
// POST: Zertifikat freigeben (Kursleiter) oder anfordern (Teilnehmer)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prepareCertificate } from "@/modules/praevention/services/certificate.service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const enrollmentId = request.nextUrl.searchParams.get("enrollmentId");
  if (!enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId erforderlich" },
      { status: 400 },
    );
  }

  try {
    const data = await prepareCertificate(enrollmentId);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  let body: { enrollmentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Format" }, { status: 400 });
  }

  if (!body.enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId erforderlich" },
      { status: 400 },
    );
  }

  try {
    const data = await prepareCertificate(body.enrollmentId);

    // Kursleiter als Aussteller markieren
    await supabase
      .from("prevention_enrollments")
      .update({
        certificate_issued_by: user.id,
        certificate_issued_at: new Date().toISOString(),
      })
      .eq("id", body.enrollmentId);

    return NextResponse.json({
      success: true,
      certificateId: data.certificateId,
      data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
