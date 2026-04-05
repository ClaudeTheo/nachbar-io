import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { updateMember } from "@/modules/gruppen/services/gruppen.service";

// PATCH /api/groups/[id]/members/[uid] — Mitglied verwalten
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  const { id, uid } = await params;
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
    const data = await updateMember(supabase, user.id, id, uid, body as { role?: string; status?: string });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
