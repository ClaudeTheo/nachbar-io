import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelMealSignup } from "@/lib/services/meals.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    let body: { meal_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
    }

    const result = await cancelMealSignup(supabase, user.id, {
      meal_id: body.meal_id ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
