import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { beginPasskeyRegistration } from "@/lib/services/passkey.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  try {
    const options = await beginPasskeyRegistration(
      supabase,
      user.id,
      user.email,
    );
    return NextResponse.json(options);
  } catch (error) {
    return handleServiceError(error);
  }
}
