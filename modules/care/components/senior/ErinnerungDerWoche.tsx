"use client";

// Welle SP2-2 — „Erinnerung der Woche".
// Zeigt EIN Foto der Woche gross, mit seiner Bildunterschrift als Geschichte und
// einer Ein-Tap-Sprachantwort. Verwendet bewusst den SB-2-Baustein
// (FamilienMomentCard) wieder — nur mit eigener Ueberschrift. Welches Foto pro
// Woche erscheint, entscheidet getErinnerungDerWoche (deterministisch, rotierend).
// Reine Anzeige, keine Auswertung, kein „Bericht"/„Monitoring".

import {
  FamilienMomentCard,
  type FamilienMomentPhoto,
} from "@/modules/care/components/senior/FamilienMomentCard";

export function ErinnerungDerWoche({
  photo,
}: {
  photo: FamilienMomentPhoto | null;
}) {
  if (!photo || !photo.url) return null;
  return <FamilienMomentCard photo={photo} heading="Erinnerung der Woche" />;
}
