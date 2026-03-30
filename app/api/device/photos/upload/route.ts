import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// Maximale Dateigroesse: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Erlaubte MIME-Types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// POST /api/device/photos/upload
// Angehoerige (Plus) laden Fotos fuer den Kiosk hoch.
// Auth: Supabase Auth Token (Authorization: Bearer <jwt>)
export async function POST(request: NextRequest) {
  try {
    // --- Auth: Supabase JWT ---
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization-Header fehlt" },
        { status: 401 },
      );
    }
    const jwt = authHeader.slice(7).trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey || !serviceKey) {
      return NextResponse.json(
        { error: "Server-Konfiguration unvollstaendig" },
        { status: 500 },
      );
    }

    // User-Client fuer Auth-Check
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    // Service-Client fuer Storage + DB (umgeht RLS)
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // --- Household ermitteln (via caregiver_links ODER eigener Haushalt) ---
    const householdId = request.nextUrl.searchParams.get("household_id");
    if (!householdId) {
      return NextResponse.json(
        { error: "household_id Parameter fehlt" },
        { status: 400 },
      );
    }

    // Pruefe ob User Zugriff auf diesen Haushalt hat
    // 1. Eigener Haushalt?
    const { data: ownMember } = await serviceClient
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Caregiver-Link?
    const { data: caregiverLink } = await serviceClient
      .from("caregiver_links")
      .select("id")
      .eq("caregiver_id", user.id)
      .is("revoked_at", null)
      .maybeSingle();

    // Zugriff nur fuer Haushaltsmitglieder oder verknuepfte Caregiver
    const residentUserId = caregiverLink
      ? (
          await serviceClient
            .from("caregiver_links")
            .select("resident_id")
            .eq("caregiver_id", user.id)
            .is("revoked_at", null)
            .single()
        ).data?.resident_id
      : null;

    let hasAccess = !!ownMember;
    if (!hasAccess && residentUserId) {
      const { data: residentHousehold } = await serviceClient
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", residentUserId)
        .maybeSingle();
      hasAccess = !!residentHousehold;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Kein Zugriff auf diesen Haushalt" },
        { status: 403 },
      );
    }

    // --- Datei aus FormData lesen ---
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const caption = (formData.get("caption") as string) || "";

    if (!file) {
      return NextResponse.json(
        { error: "Kein Foto im Request (Feld: photo)" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Dateityp ${file.type} nicht erlaubt. Erlaubt: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei zu gross (max. 10 MB)" },
        { status: 400 },
      );
    }

    // --- Upload zu Supabase Storage ---
    const photoId = randomUUID();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${householdId}/${photoId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await serviceClient.storage
      .from("kiosk-photos")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[photos/upload] Storage Fehler:", uploadError.message);
      return NextResponse.json(
        { error: "Upload fehlgeschlagen" },
        { status: 500 },
      );
    }

    // --- DB-Eintrag erstellen ---
    const { error: dbError } = await serviceClient.from("kiosk_photos").insert({
      id: photoId,
      household_id: householdId,
      storage_path: storagePath,
      caption: caption.slice(0, 200),
      uploaded_by: user.id,
      visible: true,
      pinned: false,
    });

    if (dbError) {
      console.error("[photos/upload] DB Fehler:", dbError.message);
      // Storage-Datei aufräumen
      await serviceClient.storage.from("kiosk-photos").remove([storagePath]);
      return NextResponse.json(
        { error: "Foto-Eintrag speichern fehlgeschlagen" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: photoId,
        storage_path: storagePath,
        caption: caption.slice(0, 200),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[photos/upload] Unerwarteter Fehler:", error);
    return NextResponse.json(
      { error: "Interner Server-Fehler" },
      { status: 500 },
    );
  }
}
