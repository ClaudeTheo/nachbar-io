import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { completePasskeyRegistration } from "@/lib/services/passkey.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const admin = getAdminSupabase();
    const result = await completePasskeyRegistration(
      supabase,
      admin,
      user.id,
      body,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
