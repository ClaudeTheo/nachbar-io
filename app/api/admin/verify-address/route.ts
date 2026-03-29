import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { processVerification } from "@/modules/admin/services/verify-address.service";

/**
 * POST /api/admin/verify-address
 *
 * Admin genehmigt oder lehnt eine Verifizierungsanfrage ab.
 * Body: { requestId, action: 'approve' | 'reject', note? }
 */
export async function POST(request: NextRequest) {
  // 1. Admin-Check
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  // 2. Body parsen
  const body = await request.json();
  const { requestId, action, note } = body;

  if (!requestId || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "requestId und action (approve/reject) erforderlich" },
      { status: 400 }
    );
  }

  // 3. Service aufrufen
  try {
    const adminSupabase = getAdminSupabase();
    const baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
    const result = await processVerification(adminSupabase, {
      requestId,
      action,
      note,
      reviewedBy: user.id,
      baseUrl,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
