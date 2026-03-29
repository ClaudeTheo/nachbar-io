// app/api/youth/tasks/route.ts
// Jugend-Modul: Aufgaben auflisten + erstellen (Thin Wrapper)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listYouthTasks,
  createYouthTask,
} from "@/modules/youth/services/youth-routes.service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const result = await listYouthTasks(supabase, user.id, {
      quarterId: searchParams.get("quarter_id"),
      category: searchParams.get("category"),
      status: searchParams.get("status") || "open",
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createYouthTask(supabase, user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
