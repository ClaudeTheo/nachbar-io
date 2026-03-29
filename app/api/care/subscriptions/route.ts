// app/api/care/subscriptions/route.ts
// Nachbar.io — Abo-Verwaltungs-API

import { NextResponse } from "next/server";
import { requireAuth, careLog } from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getSubscription,
  updateSubscription,
  updateSubscriptionStatus,
} from "@/modules/care/services/subscriptions.service";

/**
 * GET /api/care/subscriptions
 * Aktuelles Abo des eingeloggten Users laden.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const data = await getSubscription(auth.supabase, auth.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/care/subscriptions
 * Abo erstellen oder Plan ändern.
 * Body: { plan: CareSubscriptionPlan }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 },
    );
  }

  careLog("subscriptions", "change", {
    userId: auth.user.id,
    newPlan: body.plan,
  });

  try {
    const result = await updateSubscription(auth.supabase, auth.user.id, body);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * PATCH /api/care/subscriptions
 * Abo-Status ändern (kündigen, reaktivieren).
 * Body: { status: 'cancelled' | 'active' }
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 },
    );
  }

  careLog("subscriptions", "status_change", {
    userId: auth.user.id,
    newStatus: body.status,
  });

  try {
    const data = await updateSubscriptionStatus(
      auth.supabase,
      auth.user.id,
      body,
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
