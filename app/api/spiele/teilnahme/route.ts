// POST /api/spiele/teilnahme — Punkte NUR fuers Mitmachen am Tagesraetsel.
//
// Bewusst gehaertet (Welle SP1-4): kein Request-Parameter, kein Body-Parsing.
// Die Route nimmt KEINE Spielergebnisse (richtig/falsch) und KEINE Aktion vom
// Client an — die Aktion ist serverseitig hartkodiert auf "daily_puzzle"
// (5 Punkte, 1x/Tag via awardPoints-Tageslimit). So kann der Client keine
// hoeherwertige Aktion erschleichen. Cookie-Auth (User-Kontext); unauth -> 401.
// Aufruf erfolgt fire-and-forget vom Client beim Oeffnen des Raetsels.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardPoints } from "@/modules/gamification";

export async function POST() {
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

  const result = await awardPoints(supabase, user.id, "daily_puzzle");
  return NextResponse.json(result);
}
