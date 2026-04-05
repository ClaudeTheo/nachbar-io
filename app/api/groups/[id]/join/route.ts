import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { joinGroup } from "@/modules/gruppen/services/gruppen.service";

// POST /api/groups/[id]/join — Gruppe beitreten
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    const data = await joinGroup(supabase, user.id, id);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
