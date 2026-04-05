import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { leaveGroup } from "@/modules/gruppen/services/gruppen.service";

// POST /api/groups/[id]/leave — Gruppe verlassen
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    await leaveGroup(supabase, user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleServiceError(error);
  }
}
