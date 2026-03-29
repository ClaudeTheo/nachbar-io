import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";
import { getDevicePhotos } from "@/lib/services/device.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateDevice(request);
    if (isAuthError(authResult)) return authResult;
    const { device, supabase } = authResult;

    const result = await getDevicePhotos(supabase, device);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
