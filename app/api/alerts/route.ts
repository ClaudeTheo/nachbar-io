import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import { validateLocationData } from "@/modules/alerts/services/validate-location";
import {
  getLocationForRole,
  type LocationRole,
} from "@/modules/alerts/services/location-visibility";

// Minimaler Zeilentyp der Alert-Liste (komplexer Join-Select liefert any)
interface AlertListRow {
  id: string;
  user_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_source: string | null;
  household?: unknown;
  [key: string]: unknown;
}

// GET /api/alerts — Alle aktiven Alerts abrufen (authentifiziert)
// Datenminimiert (Security H3 / DSGVO W5): KEINE Haushalts-Adresse, Koordinaten
// je nach Rolle/Helfer-Status des Abrufers. Exakte Einzel-Position nur ueber
// /api/alerts/[id]/location.
export async function GET() {
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer dürfen Alerts sehen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  // households-Join entfernt: die volle Adresse wird nicht mehr an alle
  // Quartiersmitglieder ausgeliefert.
  const { data, error } = await supabase
    .from("alerts")
    .select(
      "*, user:user_public_profiles!alerts_user_public_profile_fkey(display_name, avatar_url), responses:alert_responses(*, responder:user_public_profiles!alert_responses_public_profile_fkey(display_name, avatar_url))",
    )
    .in("status", ["open", "help_coming"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Alerts-Abfrage fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Alerts konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  const alerts = (data ?? []) as AlertListRow[];
  if (alerts.length === 0) {
    return NextResponse.json([]);
  }

  // Rolle des Abrufers fuer die Standort-Praezision bestimmen (Prioritaet wie
  // /api/alerts/[id]/location). Alle Lookups gebatcht ueber die Liste.
  const alertIds = alerts.map((a) => a.id);

  // Plus-Angehoeriger: fuer welche Bewohner ist der Abrufer Angehoeriger?
  const { data: caregiverLinks } = await supabase
    .from("caregiver_links")
    .select("resident_id")
    .eq("caregiver_id", user.id)
    .is("revoked_at", null);
  const residentIds = new Set(
    ((caregiverLinks ?? []) as { resident_id: string }[]).map(
      (l) => l.resident_id,
    ),
  );

  // Pro-Organisation?
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Arzt (Pro Medical)?
  const { data: doctorProfile } = await supabase
    .from("doctor_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Auf welche Alerts hat der Abrufer geantwortet (= bestaetigter Helfer)?
  const { data: responses } = await supabase
    .from("alert_responses")
    .select("alert_id")
    .eq("responder_user_id", user.id)
    .in("alert_id", alertIds);
  const respondedAlertIds = new Set(
    ((responses ?? []) as { alert_id: string }[]).map((r) => r.alert_id),
  );

  const minimized = alerts.map((alert) => {
    // household defensiv entfernen (falls je wieder mitselektiert)
    const rest = { ...alert };
    delete rest.household;

    // Rolle pro Alert bestimmen
    let role: LocationRole = "free";
    let isConfirmedHelper = false;
    if (alert.user_id && residentIds.has(alert.user_id)) {
      role = "plus_family";
    } else if (orgMember) {
      role = "pro";
      isConfirmedHelper = respondedAlertIds.has(alert.id);
    } else if (doctorProfile) {
      role = "pro_medical";
      isConfirmedHelper = respondedAlertIds.has(alert.id);
    }

    const location = getLocationForRole(
      {
        location_lat: alert.location_lat,
        location_lng: alert.location_lng,
        location_source: alert.location_source,
      },
      role,
      isConfirmedHelper,
    );

    return {
      ...rest,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
      location_exact: location?.exact ?? false,
    };
  });

  return NextResponse.json(minimized);
}

// POST /api/alerts — Neuen Alert erstellen und Nachbarn benachrichtigen
export async function POST(request: NextRequest) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }
  const {
    category,
    title,
    description,
    household_id,
    is_emergency,
    location_lat,
    location_lng,
    location_source,
  } = body;

  // Input-Validierung
  const VALID_CATEGORIES = [
    "noise",
    "package",
    "security",
    "fire",
    "health_concern",
    "medical",
    "crime",
    "other",
  ];
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Ungültige Kategorie" }, { status: 400 });
  }
  if (!title || title.length < 3 || title.length > 200) {
    return NextResponse.json(
      { error: "Titel muss 3-200 Zeichen lang sein" },
      { status: 400 },
    );
  }
  // SICHERHEIT (H8): Beschreibung begrenzen
  if (
    description &&
    (typeof description !== "string" || description.length > 2000)
  ) {
    return NextResponse.json(
      { error: "Beschreibung darf maximal 2000 Zeichen lang sein" },
      { status: 400 },
    );
  }

  // GPS-Validierung
  const locValidation = validateLocationData(
    location_lat,
    location_lng,
    location_source,
  );
  if (!locValidation.valid) {
    return NextResponse.json({ error: locValidation.error }, { status: 400 });
  }

  // Household-Ownership prüfen (falls angegeben)
  if (household_id) {
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("household_id", household_id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json(
        { error: "Sie gehören nicht zu diesem Haushalt" },
        { status: 403 },
      );
    }
  }

  // Quartier-ID des Nutzers ermitteln
  const quarterId = await getUserQuarterId(supabase, user.id);

  // Alert erstellen
  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      household_id,
      category,
      title,
      description: description || null,
      location_lat:
        location_source && location_source !== "none" ? location_lat : null,
      location_lng:
        location_source && location_source !== "none" ? location_lng : null,
      location_source: location_source || "none",
      status: "open",
      is_emergency: is_emergency || false,
      current_radius: 1,
      quarter_id: quarterId,
    })
    .select()
    .single();

  if (error) {
    console.error("Alert-Erstellung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Alert konnte nicht erstellt werden" },
      { status: 500 },
    );
  }

  // Push-Notifications an Quartiersmitglieder senden (interner Aufruf)
  try {
    const baseUrl =
      request.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://quartierapp.de";
    await fetch(`${baseUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
      },
      body: JSON.stringify({
        title: `${is_emergency ? "NOTFALL: " : ""}${title}`,
        body: description || "Neue Meldung in Ihrem Quartier",
        url: `/alerts`,
        tag: `alert-${alert.id}`,
        urgent: is_emergency || false,
        excludeUserId: user.id,
      }),
    });
  } catch (pushError) {
    // Push-Fehler blockiert nicht die Alert-Erstellung
    console.error("Push-Benachrichtigung fehlgeschlagen:", pushError);
  }

  return NextResponse.json(alert, { status: 201 });
}
