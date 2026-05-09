// Welle H — GET /api/admin/quarters/[id]/oepnv-stops/discover
//
// Liefert einen Stop-Vorschlag aus EFA-BW fuer das Quartier-Center.
// Schreibt nichts in DB — Admin kopiert manuell in municipal_config.oepnv_stops.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/services/service-error";
import { discoverOepnvStopsForQuarter } from "@/modules/info-hub/services/oepnv-stops-discovery.service";

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

function parseLimit(url: URL): number {
  const raw = url.searchParams.get("limit");
  if (!raw) return 5;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(Math.floor(n), 25);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const url = new URL(request.url);
  const limit = parseLimit(url);

  try {
    const result = await discoverOepnvStopsForQuarter(getAdminDb(), id, {
      limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
