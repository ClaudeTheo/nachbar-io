import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  claimChildSetupInvitation,
  type FamilySetupDb as ChildSetupDb,
} from "@/lib/family-setup/child-setup.service";
import {
  claimSeniorSetupInvitation,
  type FamilySetupDb as SeniorSetupDb,
} from "@/lib/family-setup/senior-setup.service";
import { canClaimInvitation, hashSetupToken } from "@/lib/family-setup/token";
import { handleServiceError } from "@/lib/services/service-error";
import {
  extractAuditContextFromRequest,
  recordFamilySetupAudit,
} from "@/lib/family-setup/audit.service";
import type { FamilySetupFlowType, FamilySetupStatus, FamilySetupUiMode } from "@/lib/family-setup/types";

interface RouteContext {
  params: Promise<{ token: string }>;
}

interface SetupPreviewRow {
  id: string;
  flow_type: FamilySetupFlowType;
  target_ui_mode: FamilySetupUiMode;
  status: FamilySetupStatus;
  used_at: string | null;
  expires_at: string;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const db = getAdminSupabase();
  const preview = await loadSafePreview(db, token);

  if (!preview) {
    return invalidSetupCodeResponse();
  }

  return NextResponse.json({
    flowType: preview.flow_type,
    targetUiMode: preview.target_ui_mode,
    expiresAt: preview.expires_at,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const db = getAdminSupabase();
  const preview = await loadSafePreview(db, token);

  if (!preview) {
    return invalidSetupCodeResponse();
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
  }

  const input = {
    token,
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    displayName: String(body.displayName ?? ""),
  };

  try {
    const serviceDb = db as unknown;
    const result =
      preview.flow_type === "senior_setup"
        ? await claimSeniorSetupInvitation(serviceDb as SeniorSetupDb, input)
        : await claimChildSetupInvitation(serviceDb as ChildSetupDb, input);

    // Pass 63 Audit FS-2: Claim immer auditieren (DSGVO Art. 32).
    // Best-Effort — Audit-Fehler bricht den Claim nicht ab.
    await recordFamilySetupAudit(db, {
      invitationId: preview.id,
      actorUserId: result.userId ?? null,
      eventType: "invitation_claimed",
      context: extractAuditContextFromRequest(request),
      metadata: {
        flow_type: preview.flow_type,
        target_ui_mode: preview.target_ui_mode,
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Audit auch bei Fehlern (Forensik bei Token-Probing oder Race-Conditions)
    await recordFamilySetupAudit(db, {
      invitationId: preview.id,
      actorUserId: null,
      eventType: "invitation_rollback",
      context: extractAuditContextFromRequest(request),
      metadata: {
        flow_type: preview.flow_type,
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    return handleServiceError(error);
  }
}

async function loadSafePreview(
  db: ReturnType<typeof getAdminSupabase>,
  token: string,
): Promise<SetupPreviewRow | null> {
  if (!token) return null;

  const { data, error } = await db
    .from("family_setup_invitations")
    .select("id, flow_type, target_ui_mode, status, used_at, expires_at")
    .eq("token_hash", hashSetupToken(token))
    .single<SetupPreviewRow>();

  if (error || !data || !canClaimInvitation(data)) {
    return null;
  }

  return data;
}

function invalidSetupCodeResponse() {
  return NextResponse.json(
    { error: "Setup-Code ist ungueltig oder abgelaufen." },
    { status: 410 },
  );
}
