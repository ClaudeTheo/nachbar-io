import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { listMembers } from "@/modules/gruppen/services/gruppen.service";

// GET /api/groups/[id]/members — Mitgliederliste
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  try {
    const data = await listMembers(supabase, id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
