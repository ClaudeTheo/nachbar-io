// Welle I — POST /api/admin/quarters/[id]/oepnv-stops
//
// Schreibt eine vom Admin gewaehlte Stop-Liste in municipal_config.oepnv_stops.
// Pendant zur Discover-Route (Welle H).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/services/service-error";
import {
  applyOepnvStopsForQuarter,
  type OepnvStopInput,
} from "@/modules/info-hub/services/oepnv-stops-apply.service";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return {
      error: NextResponse.json({ error: "Nur Super-Admins" }, { status: 403 }),
    };
  }
  return { user };
}

function getAdminDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body muss JSON sein." }, { status: 400 });
  }

  const stops = (body as { stops?: unknown })?.stops;
  if (!Array.isArray(stops)) {
    return NextResponse.json(
      { error: "Body braucht ein stops-Array." },
      { status: 400 },
    );
  }

  try {
    const result = await applyOepnvStopsForQuarter(
      getAdminDb(),
      id,
      stops as OepnvStopInput[],
    );
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
