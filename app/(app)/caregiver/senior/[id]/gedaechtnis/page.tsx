// app/(app)/caregiver/senior/[id]/gedaechtnis/page.tsx
// Welle C C8 — Caregiver-Memory-Seite (Architektur 1b+2a+3a).
//
// Server-Component:
//   1. Auth-Gate: redirect("/login") wenn kein User.
//   2. caregiver_links-Gate: notFound() wenn kein aktiver Link auf den
//      Senior existiert (Existenz des Seniors nicht leaken).
//   3. Senior-Display-Name via RPC get_display_names() (SECURITY-DEFINER,
//      Mig 167).
//   4. Client-Komponente mit seniorId + seniorName + currentUserId rendern.

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaregiverGedaechtnisClient } from "@/modules/memory/components/CaregiverGedaechtnisClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaregiverGedaechtnisPage({ params }: Props) {
  const { id: seniorId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Caregiver-Link pruefen: nur mit aktivem Link (revoked_at IS NULL) auf
  // genau diesen Senior. notFound() statt 403, damit die Existenz des
  // Senior-Accounts nicht leakt.
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", user.id)
    .eq("resident_id", seniorId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!link) {
    notFound();
  }

  // Senior-Display-Name via SECURITY-DEFINER-RPC (Mig 167) abrufen.
  // Fallback auf "dem Senior" wenn RPC fehlschlaegt oder Name leer ist.
  let seniorName = "dem Senior";
  const { data: names } = await supabase.rpc("get_display_names", {
    peer_ids: [seniorId],
  });
  const match = Array.isArray(names)
    ? (names as Array<{ id: string; display_name: string | null }>).find(
        (n) => n.id === seniorId,
      )
    : null;
  if (match?.display_name) {
    seniorName = match.display_name;
  }

  return (
    <CaregiverGedaechtnisClient
      seniorId={seniorId}
      seniorName={seniorName}
      currentUserId={user.id}
    />
  );
}
