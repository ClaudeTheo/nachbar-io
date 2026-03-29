// app/api/caregiver/kiosk-reminders/route.ts
// Nachbar.io — Kiosk-Erinnerungen: Auflisten und Anlegen (Thin Handler)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listKioskReminders,
  createKioskReminder,
} from "@/modules/care/services/caregiver/kiosk-reminders.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  const householdId = request.nextUrl.searchParams.get("household_id");

  try {
    const result = await listKioskReminders(
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

  let body: {
    household_id?: string;
    type?: string;
    title?: string;
    scheduled_at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  try {
    const result = await createKioskReminder(auth.supabase, auth.user.id, {
      household_id: body.household_id ?? "",
      type: body.type ?? "",
      title: body.title ?? "",
      scheduled_at: body.scheduled_at,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
