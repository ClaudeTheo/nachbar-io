import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function GET(request: NextRequest) {
  const authResult = await authenticateDevice(request);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  const { data: photos, error } = await supabase
    .from("kiosk_photos")
    .select("id, storage_path, caption, pinned, created_at")
    .eq("household_id", device.household_id)
    .eq("visible", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[device/photos] Fehler:", error.message);
    return NextResponse.json({ photos: [] });
  }

  // Signierte URLs (6 Stunden)
  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("kiosk-photos")
        .createSignedUrl(photo.storage_path, 21600);
      return {
        id: photo.id,
        url: signed?.signedUrl ?? null,
        caption: photo.caption,
        pinned: photo.pinned,
        createdAt: photo.created_at,
      };
    })
  );

  return NextResponse.json({ photos: photosWithUrls });
}
