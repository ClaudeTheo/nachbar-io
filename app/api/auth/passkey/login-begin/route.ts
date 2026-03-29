import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { beginLogin } from "@/lib/services/passkey.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST() {
  try {
    const admin = getAdminSupabase();
    const result = await beginLogin(admin);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
