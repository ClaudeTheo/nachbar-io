import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import {
  createSeniorSetupInvitation,
  type FamilySetupDb as SeniorSetupDb,
} from "@/lib/family-setup/senior-setup.service";
import type { SeniorRelationshipType } from "@/lib/family-setup/types";

const RELATIONSHIPS: SeniorRelationshipType[] = [
  "partner",
  "child",
  "grandchild",
  "friend",
  "volunteer",
  "other",
];

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
    const relationshipType = RELATIONSHIPS.includes(
      body.relationshipType as SeniorRelationshipType,
    )
      ? (body.relationshipType as SeniorRelationshipType)
      : "other";
    const targetUiMode = body.targetUiMode === "comfort" ? "comfort" : "senior";

    const adminDb = getAdminSupabase() as unknown as SeniorSetupDb;
    const result = await createSeniorSetupInvitation(adminDb, {
      caregiverUserId: user.id,
      seniorDisplayName: String(body.seniorDisplayName ?? ""),
      relationshipType,
      targetUiMode,
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
