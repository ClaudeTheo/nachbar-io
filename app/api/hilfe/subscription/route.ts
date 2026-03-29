// GET /api/hilfe/subscription — Subscription-Status
// POST /api/hilfe/subscription — Abo-Verwaltung (pause/resume/cancel)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getSubscription,
  updateSubscription,
} from "@/modules/hilfe/services/hilfe-billing.service";

export async function GET() {
  try {
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

    const result = await getSubscription(supabase, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { action } = await request.json();
    const result = await updateSubscription(supabase, user.id, action);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
