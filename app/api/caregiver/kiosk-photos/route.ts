// app/api/caregiver/kiosk-photos/route.ts
// Nachbar.io — Kiosk-Fotos: Auflisten und Hochladen (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listKioskPhotos,
  uploadKioskPhoto,
} from "@/modules/care/services/caregiver/kiosk-photos.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const householdId = request.nextUrl.searchParams.get("household_id");

  try {
    const result = await listKioskPhotos(
      auth.supabase,
      auth.user.id,
      householdId ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: { household_id?: string; storage_path?: string; caption?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  try {
    const result = await uploadKioskPhoto(auth.supabase, auth.user.id, {
      household_id: body.household_id ?? "",
      storage_path: body.storage_path ?? "",
      caption: body.caption,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
