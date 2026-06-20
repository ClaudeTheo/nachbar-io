// GET /api/senior/photos — Familienfotos des eigenen Haushalts (Welle SB-3)
//
// Cookie-Auth (User-Kontext). Das Haushalts-Scoping uebernimmt die RLS-Policy
// aus SB-1; der Service liefert Signed-URLs. Antwort ist ein ARRAY (nie { items }),
// nur Fotos mit gueltiger Signed-URL.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeniorHouseholdPhotos } from "@/modules/care/services/senior-kiosk.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const photos = await getSeniorHouseholdPhotos(supabase, { limit: 50 });
  const items = photos
    .filter((photo) => photo.url !== null)
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
    }));

  return NextResponse.json(items);
}
