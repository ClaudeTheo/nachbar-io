// DELETE /api/chat-groups/[id] — Gruppe loeschen (nur Admin, RLS-enforced)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { deleteGroup } from "@/modules/chat/services/chat-groups.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    await deleteGroup(supabase, groupId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, request, "/api/chat-groups/[id]");
  }
}
