import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { completeLogin } from "@/lib/services/passkey.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = getAdminSupabase();
    const result = await completeLogin(admin, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
