import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { createYouthFriendInviteRequest } from "@/lib/family-setup/youth-friend-invites.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await createYouthFriendInviteRequest(getAdminSupabase(), {
      childUserId: user.id,
      friendDisplayName: String(body.friendDisplayName ?? ""),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
