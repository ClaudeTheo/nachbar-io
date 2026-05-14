import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { approveYouthFriendInviteRequest } from "@/lib/family-setup/youth-friend-invites.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await approveYouthFriendInviteRequest(getAdminSupabase(), {
      guardianUserId: user.id,
      requestId: id,
      appUrl: new URL(request.url).origin,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleServiceError(error);
  }
}
