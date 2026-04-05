// POST/DELETE /api/prevention/visibility
// Sichtbarkeits-Einwilligung erteilen/widerrufen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  grantVisibility,
  revokeVisibility,
  getMyVisibilityConsents,
  type ViewerType,
} from "@/modules/praevention/services/visibility.service";

// GET: Eigene Einwilligungen laden
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json([], { status: 401 });
    }

    const consents = await getMyVisibilityConsents(user.id);
    return NextResponse.json(consents);
  } catch (err) {
    console.error("Visibility GET error:", err);
    return NextResponse.json([]);
  }
}

// POST: Einwilligung erteilen
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { enrollmentId, viewerType } = await req.json();

    if (!enrollmentId || !viewerType) {
      return NextResponse.json(
        { error: "enrollmentId und viewerType erforderlich" },
        { status: 400 },
      );
    }

    const validTypes: ViewerType[] = ["caregiver", "org_member"];
    if (!validTypes.includes(viewerType)) {
      return NextResponse.json(
        { error: "Ungültiger viewerType" },
        { status: 400 },
      );
    }

    const consent = await grantVisibility(user.id, enrollmentId, viewerType);
    return NextResponse.json(consent);
  } catch (err) {
    console.error("Visibility POST error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// DELETE: Einwilligung widerrufen
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { enrollmentId, viewerType } = await req.json();

    if (!enrollmentId || !viewerType) {
      return NextResponse.json(
        { error: "enrollmentId und viewerType erforderlich" },
        { status: 400 },
      );
    }

    await revokeVisibility(user.id, enrollmentId, viewerType);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Visibility DELETE error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
