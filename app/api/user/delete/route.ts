// POST /api/user/delete
// DSGVO Art. 17 — Recht auf Löschung
// Business-Logik in user-account.service.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { deleteUser } from "@/lib/services/user-account.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Body parsen
  let body: { confirmText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body" },
      { status: 400 },
    );
  }

  // Admin-Client fuer Auth-User-Löschung (erfordert Service-Role-Key)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  try {
    const result = await deleteUser(
      adminSupabase,
      user.id,
      body.confirmText ?? "",
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
