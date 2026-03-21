import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    let body: { meal_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
    }

    const { meal_id } = body;
    if (!meal_id) {
      return NextResponse.json({ error: "meal_id erforderlich." }, { status: 400 });
    }

    // Vorherigen Status der Mahlzeit laden
    const { data: meal } = await supabase
      .from("shared_meals")
      .select("id, status")
      .eq("id", meal_id)
      .single();

    if (!meal) {
      return NextResponse.json({ error: "Mahlzeit nicht gefunden." }, { status: 404 });
    }

    // Eigene Anmeldung stornieren
    const { error: cancelError, count } = await supabase
      .from("meal_signups")
      .update({ status: "cancelled" })
      .eq("meal_id", meal_id)
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 400 });
    }

    if (!count || count === 0) {
      return NextResponse.json({ error: "Keine aktive Anmeldung gefunden." }, { status: 404 });
    }

    // Wenn vorher 'full' → wieder 'active' setzen
    if (meal.status === "full") {
      await supabase
        .from("shared_meals")
        .update({ status: "active" })
        .eq("id", meal_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[meals/cancel] Fehler:", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
