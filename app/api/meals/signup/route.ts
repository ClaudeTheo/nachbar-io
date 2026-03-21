import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { safeInsertNotification } from "@/lib/notifications-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    let body: { meal_id?: string; portions?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
    }

    const { meal_id, portions = 1 } = body;
    if (!meal_id) {
      return NextResponse.json({ error: "meal_id erforderlich." }, { status: 400 });
    }

    // Mahlzeit laden (inkl. Titel fuer Notification)
    const { data: meal, error: mealError } = await supabase
      .from("shared_meals")
      .select("id, servings, status, user_id, title")
      .eq("id", meal_id)
      .single();

    if (mealError || !meal) {
      return NextResponse.json({ error: "Mahlzeit nicht gefunden." }, { status: 404 });
    }

    if (meal.status !== "active") {
      return NextResponse.json({ error: "Keine Plätze mehr verfügbar." }, { status: 409 });
    }

    if (meal.user_id === user.id) {
      return NextResponse.json({ error: "Sie können sich nicht für Ihr eigenes Angebot anmelden." }, { status: 400 });
    }

    // Aktuelle Anmeldungen zaehlen
    const { count } = await supabase
      .from("meal_signups")
      .select("id", { count: "exact", head: true })
      .eq("meal_id", meal_id)
      .eq("status", "confirmed");

    const currentCount = count ?? 0;
    if (currentCount + portions > meal.servings) {
      return NextResponse.json({ error: "Nicht genügend Plätze verfügbar." }, { status: 409 });
    }

    // Anmeldung einfuegen
    const { error: signupError } = await supabase
      .from("meal_signups")
      .insert({
        meal_id,
        user_id: user.id,
        portions,
        status: "confirmed",
      });

    if (signupError) {
      // Duplicate? (UNIQUE constraint)
      if (signupError.code === "23505") {
        return NextResponse.json({ error: "Sie sind bereits angemeldet." }, { status: 409 });
      }
      return NextResponse.json({ error: signupError.message }, { status: 400 });
    }

    const isFull = currentCount + portions >= meal.servings;

    // Wenn letzte Portion(en) vergeben → Status auf 'full' setzen
    if (isFull) {
      await supabase
        .from("shared_meals")
        .update({ status: "full" })
        .eq("id", meal_id);
    }

    // Push-Notifications (fire-and-forget, Fehler blockieren nicht)
    try {
      const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceUrl && serviceKey) {
        const serviceClient = createServiceClient(serviceUrl, serviceKey);

        // Anzeigename des Anmelders laden
        const { data: signupUser } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .single();
        const userName = signupUser?.display_name ?? "Ein Nachbar";

        // 1. Push an Gastgeber: Jemand hat sich angemeldet
        await safeInsertNotification(serviceClient, {
          user_id: meal.user_id,
          type: "system",
          title: `${userName} möchte Ihre ${meal.title} haben`,
          body: `${portions} ${portions === 1 ? "Portion" : "Portionen"} angefragt.`,
          reference_id: meal_id,
          reference_type: "meal",
        });

        // 2. Falls alles vergeben → Extra-Push an Gastgeber
        if (isFull) {
          await safeInsertNotification(serviceClient, {
            user_id: meal.user_id,
            type: "system",
            title: "Alle Portionen vergeben!",
            body: `Ihr Angebot "${meal.title}" ist vollständig vergeben.`,
            reference_id: meal_id,
            reference_type: "meal",
          });
        }
      }
    } catch (notifErr) {
      console.error("[meals/signup] Notification-Fehler (nicht-blockierend):", notifErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[meals/signup] Fehler:", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
