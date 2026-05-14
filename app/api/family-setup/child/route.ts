import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import {
  createChildSetupInvitation,
  type FamilySetupDb,
} from "@/lib/family-setup/child-setup.service";

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
    const adminDb = getAdminSupabase() as unknown as FamilySetupDb;
    const result = await createChildSetupInvitation(adminDb, {
      guardianUserId: user.id,
      childDisplayName: String(body.childDisplayName ?? ""),
      childBirthYear: Number(body.childBirthYear),
      relationshipType:
        body.relationshipType === "guardian" || body.relationshipType === "other"
          ? body.relationshipType
          : "parent",
      appUrl: new URL(request.url).origin,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
    }
    return handleServiceError(error);
  }
}
