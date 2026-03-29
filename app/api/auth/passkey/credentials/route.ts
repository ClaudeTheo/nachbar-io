import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCredentials } from "@/lib/services/passkey.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const credentials = await listCredentials(supabase, user.id);
    return NextResponse.json(credentials);
  } catch (error) {
    return handleServiceError(error);
  }
}
