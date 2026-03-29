import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";
import { acknowledgeDeviceReminder } from "@/lib/services/device.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authResult = await authenticateDevice(request, body);
    if (isAuthError(authResult)) return authResult;
    const { device, supabase } = authResult;

    const result = await acknowledgeDeviceReminder(
      supabase,
      device,
      body.reminderId,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
