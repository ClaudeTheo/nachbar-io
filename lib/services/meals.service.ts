// Nachbar.io — Meals Service (Wave 5f)
// Geschaeftslogik fuer Mahlzeit-Anmeldung und -Stornierung.
// Nimmt SupabaseClient als Parameter, wirft ServiceError.

import { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { safeInsertNotification } from "@/lib/notifications-server";

// ---------- Typen ----------

/** Payload fuer Mahlzeit-Anmeldung */
export interface MealSignupPayload {
  meal_id: string;
  portions?: number;
}

/** Payload fuer Mahlzeit-Stornierung */
export interface MealCancelPayload {
  meal_id: string;
}

// ---------- Service-Funktionen ----------

/**
 * Anmeldung fuer eine Mahlzeit mit Portionsverwaltung und Push-Notification.
 * Setzt Status auf 'full' wenn alle Portionen vergeben.
 */
export async function signupForMeal(
  supabase: SupabaseClient,
  userId: string,
  payload: MealSignupPayload,
): Promise<{ success: true }> {
  const { meal_id, portions = 1 } = payload;

  if (!meal_id) {
    throw new ServiceError("meal_id erforderlich.", 400);
  }

  // Mahlzeit laden (inkl. Titel fuer Notification)
  const { data: meal, error: mealError } = await supabase
    .from("shared_meals")
    .select("id, servings, status, user_id, title")
    .eq("id", meal_id)
    .single();

  if (mealError || !meal) {
    throw new ServiceError("Mahlzeit nicht gefunden.", 404);
  }

  if (meal.status !== "active") {
    throw new ServiceError("Keine Plätze mehr verfügbar.", 409);
  }

  if (meal.user_id === userId) {
    throw new ServiceError(
      "Sie können sich nicht für Ihr eigenes Angebot anmelden.",
      400,
    );
  }

  // Aktuelle Anmeldungen zaehlen
  const { count } = await supabase
    .from("meal_signups")
    .select("id", { count: "exact", head: true })
    .eq("meal_id", meal_id)
    .eq("status", "confirmed");

  const currentCount = count ?? 0;
  if (currentCount + portions > meal.servings) {
    throw new ServiceError("Nicht genügend Plätze verfügbar.", 409);
  }

  // Anmeldung einfuegen
  const { error: signupError } = await supabase.from("meal_signups").insert({
    meal_id,
    user_id: userId,
    portions,
    status: "confirmed",
  });

  if (signupError) {
    // Duplicate? (UNIQUE constraint)
    if (signupError.code === "23505") {
      throw new ServiceError("Sie sind bereits angemeldet.", 409);
    }
    throw new ServiceError(signupError.message, 400);
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
        .eq("id", userId)
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
    console.error(
      "[meals/signup] Notification-Fehler (nicht-blockierend):",
      notifErr,
    );
  }

  return { success: true };
}

/**
 * Stornierung einer Mahlzeit-Anmeldung.
 * Setzt Mahlzeit-Status zurueck auf 'active' falls vorher 'full'.
 */
export async function cancelMealSignup(
  supabase: SupabaseClient,
  userId: string,
  payload: MealCancelPayload,
): Promise<{ success: true }> {
  const { meal_id } = payload;

  if (!meal_id) {
    throw new ServiceError("meal_id erforderlich.", 400);
  }

  // Vorherigen Status der Mahlzeit laden
  const { data: meal } = await supabase
    .from("shared_meals")
    .select("id, status")
    .eq("id", meal_id)
    .single();

  if (!meal) {
    throw new ServiceError("Mahlzeit nicht gefunden.", 404);
  }

  // Eigene Anmeldung stornieren
  const { error: cancelError, count } = await supabase
    .from("meal_signups")
    .update({ status: "cancelled" })
    .eq("meal_id", meal_id)
    .eq("user_id", userId)
    .eq("status", "confirmed");

  if (cancelError) {
    throw new ServiceError(cancelError.message, 400);
  }

  if (!count || count === 0) {
    throw new ServiceError("Keine aktive Anmeldung gefunden.", 404);
  }

  // Wenn vorher 'full' → wieder 'active' setzen
  if (meal.status === "full") {
    await supabase
      .from("shared_meals")
      .update({ status: "active" })
      .eq("id", meal_id);
  }

  return { success: true };
}
