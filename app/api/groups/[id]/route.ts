import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { getGroup, updateGroup, deleteGroup } from "@/modules/gruppen/services/gruppen.service";

// GET /api/groups/[id] — Gruppen-Detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    const data = await getGroup(supabase, id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// PATCH /api/groups/[id] — Gruppe bearbeiten
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }

  try {
    const data = await updateGroup(supabase, user.id, id, body as Parameters<typeof updateGroup>[3]);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// DELETE /api/groups/[id] — Gruppe loeschen
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    await deleteGroup(supabase, user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleServiceError(error);
  }
}
