"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SeniorButton } from "@/components/SeniorButton";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

/**
 * Seniorenmodus — Täglicher Check-in
 *
 * "Alles in Ordnung"-Button für Senioren.
 * Falls bis 12:00 kein Check-in erfolgt, wird optional
 * die Vertrauensperson benachrichtigt (mit Einwilligung).
 */

export default function SeniorCheckinPage() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [_loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCheckin() {
    setLoading(true);

    const supabase = createClient();
    const { user } = await getCachedUser(supabase);
    if (!user) return;

    await supabase.from("senior_checkins").insert({
      user_id: user.id,
      checked_in_at: new Date().toISOString(),
    });

    setCheckedIn(true);
    setLoading(false);
  }

  if (checkedIn) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">😊</div>
        <p className="senior-heading text-anthrazit">
          Danke! Schön, dass es Ihnen gut geht.
        </p>
        <p className="senior-text text-muted-foreground">
          Ihr Check-in wurde gespeichert.
        </p>
        <SeniorButton
          icon="🏠"
          label="Zurück zur Startseite"
          onClick={() => router.push("/senior/home")}
          variant="primary"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="senior-heading text-center text-anthrazit">
        Geht es Ihnen gut heute?
      </p>

      <SeniorButton
        icon="✅"
        label="Alles in Ordnung"
        onClick={handleCheckin}
        variant="success"
      />

      <p className="senior-text text-center text-muted-foreground">
        Tippen Sie auf den Button, um Ihren Nachbarn zu zeigen, dass es Ihnen gut geht.
      </p>

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          Falls Sie bis 12:00 Uhr nicht eingecheckt haben, kann Ihre
          Vertrauensperson optional informiert werden. Diese Funktion ist
          nur aktiv, wenn Sie ausdrücklich zugestimmt haben.
        </p>
      </div>
    </div>
  );
}
