// POST /api/account/delete-request
// Öffentliche API-Route für Account-Löschung via Web
// Google Play Store Policy: Account-Löschung muss auch ohne App möglich sein
// Business-Logik in user-account.service.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requestAccountDeletion } from "@/lib/services/user-account.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Supabase Admin Client (Service Role fuer OTP-Versand und Löschung)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const result = await requestAccountDeletion(supabase, {
      email: body.email,
      action: body.action,
      otp: body.otp,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
