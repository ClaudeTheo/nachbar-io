// DELETE /api/chat-groups/[id]/members/[user_id] — Mitglied entfernen
// (RLS: Admin entfernt andere, oder User entfernt sich selbst)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { removeGroupMember } from "@/modules/chat/services/chat-groups.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; user_id: string }> },
) {
  const { id: groupId, user_id: targetUserId } = await params;
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
    await removeGroupMember(supabase, groupId, targetUserId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(
      error,
      request,
      "/api/chat-groups/[id]/members/[user_id]",
    );
  }
}
