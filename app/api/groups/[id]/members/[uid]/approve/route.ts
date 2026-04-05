import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { approveMember } from "@/modules/gruppen/services/gruppen.service";

// POST /api/groups/[id]/members/[uid]/approve — Beitrittsanfrage genehmigen
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  const { id, uid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    const data = await approveMember(supabase, user.id, id, uid);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
