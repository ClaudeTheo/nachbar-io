import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";
import { submitDeviceHeartbeat } from "@/lib/services/device.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Ungültiges Anfrage-Format" },
        { status: 400 },
      );
    }

    const authResult = await authenticateDevice(request, body);
    if (isAuthError(authResult)) return authResult;
    const { device, supabase } = authResult;

    const result = await submitDeviceHeartbeat(supabase, device, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
