// app/api/care/tasks/route.ts
// Nachbar.io — Aufgabentafel: Aufgaben auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { listTasks, createTask } from "@/modules/care/services/tasks.service";

export const dynamic = "force-dynamic";

// GET /api/care/tasks — Aufgaben auflisten
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const { searchParams } = request.nextUrl;
    const data = await listTasks(auth.supabase, {
      status: searchParams.get("status") ?? "open",
      category: searchParams.get("category") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/care/tasks — Neue Aufgabe erstellen
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const task = await createTask(auth.supabase, {
      userId: auth.user.id,
      title: body.title as string | undefined,
      description: body.description as string | undefined,
      category: body.category as string | undefined,
      urgency: body.urgency as string | undefined,
      preferred_date: body.preferred_date as string | undefined,
      preferred_time_from: body.preferred_time_from as string | undefined,
      preferred_time_to: body.preferred_time_to as string | undefined,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
