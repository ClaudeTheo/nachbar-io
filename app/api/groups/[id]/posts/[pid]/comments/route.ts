import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { listComments, createComment } from "@/modules/gruppen/services/gruppen-posts.service";

// GET /api/groups/[id]/posts/[pid]/comments — Kommentare
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> },
) {
  const { pid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    const data = await listComments(supabase, pid);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/groups/[id]/posts/[pid]/comments — Neuer Kommentar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> },
) {
  const { pid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }

  try {
    const data = await createComment(supabase, user.id, pid, body.content ?? "");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
