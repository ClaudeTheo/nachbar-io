import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLocationForRole } from "@/modules/alerts/services/location-visibility";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { data: alert, error } = await supabase
    .from("alerts")
    .select("id, user_id, location_lat, location_lng, location_source, status")
    .eq("id", id)
    .single();

  if (error || !alert) {
    return NextResponse.json(
      { error: "Alert nicht gefunden" },
      { status: 404 },
    );
  }

  // 1. Plus-Angehöriger?
  const { data: caregiverLink } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", user.id)
    .eq("resident_id", alert.user_id)
    .is("revoked_at", null)
    .maybeSingle();

  if (caregiverLink) {
    const location = getLocationForRole(alert, "plus_family", false);
    return NextResponse.json({ location });
  }

  // 2. Pro-Organisation?
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (orgMember) {
    const { data: response } = await supabase
      .from("alert_responses")
      .select("id")
      .eq("alert_id", id)
      .eq("responder_user_id", user.id)
      .maybeSingle();

    const location = getLocationForRole(alert, "pro", !!response);
    return NextResponse.json({ location });
  }

  // 3. Arzt?
  const { data: doctorProfile } = await supabase
    .from("doctor_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (doctorProfile) {
    const { data: response } = await supabase
      .from("alert_responses")
      .select("id")
      .eq("alert_id", id)
      .eq("responder_user_id", user.id)
      .maybeSingle();

    const location = getLocationForRole(alert, "pro_medical", !!response);
    return NextResponse.json({ location });
  }

  // 4. Free-Nutzer
  return NextResponse.json({ location: null });
}
