// app/(senior)/erinnerung/page.tsx — Welle SP2-2
// „Erinnerung der Woche": ein deterministisch gewaehltes Familienfoto mit
// Bildunterschrift, jede Woche ein anderes. Fotos kommen server-seitig aus dem
// SB-1/SB-3-Pfad (getSeniorHouseholdPhotos, RLS-scoped, Signed-URLs) — dieselbe
// Quelle wie Screensaver/Moment-Karte. Die Wochen-Auswahl ist rein/deterministisch.

import { createClient } from "@/lib/supabase/server";
import { getSeniorHouseholdPhotos } from "@/modules/care/services/senior-kiosk.service";
import { getErinnerungDerWoche } from "@/modules/spiele/services/erinnerung-der-woche.service";
import { ErinnerungDerWoche } from "@/modules/care/components/senior/ErinnerungDerWoche";

export const metadata = {
  title: "Erinnerung der Woche",
};

export default async function SeniorErinnerungPage() {
  const supabase = await createClient();
  const photos = await getSeniorHouseholdPhotos(supabase, { limit: 50 });
  const weekly = getErinnerungDerWoche(new Date(), photos);

  return (
    <section aria-label="Erinnerung der Woche">
      <h1 className="mb-2 text-2xl font-bold text-anthrazit">
        Erinnerung der Woche
      </h1>
      <p className="mb-6 text-base text-anthrazit/70">
        Jede Woche ein Bild aus Ihrem Familienkreis — mit einer kleinen
        Geschichte.
      </p>

      {weekly ? (
        <ErinnerungDerWoche
          photo={{
            url: weekly.url,
            caption: weekly.caption,
            uploaderId: weekly.uploaderId,
          }}
        />
      ) : (
        <p className="text-lg leading-snug text-anthrazit">
          Sobald Ihre Familie ein Foto mit einer kleinen Beschreibung teilt,
          erscheint hier jede Woche eine Erinnerung.
        </p>
      )}
    </section>
  );
}
