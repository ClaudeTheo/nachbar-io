// app/(senior)/spiele/paare-finden/page.tsx — Welle SP2-1
// „Paare finden" mit den eigenen Familienfotos. Die Fotos kommen server-seitig
// aus dem SB-1/SB-3-Pfad (getSeniorHouseholdPhotos, RLS-scoped, Signed-URLs) —
// dieselbe Quelle wie der Screensaver. Das Raster skaliert nach Fotomenge; zu
// wenige Fotos -> Emoji-Fallback. Kein Timer, kein Score, nichts wird gespeichert.

import { createClient } from "@/lib/supabase/server";
import { getSeniorHouseholdPhotos } from "@/modules/care/services/senior-kiosk.service";
import { PaareFinden } from "@/modules/spiele/components/PaareFinden";
import {
  planPaareBoard,
  buildEmojiPaare,
  type PaarItem,
} from "@/modules/spiele/services/paare-board";

export const metadata = {
  title: "Paare finden",
};

export default async function SeniorPaareFindenPage() {
  const supabase = await createClient();
  const photos = (
    await getSeniorHouseholdPhotos(supabase, { limit: 12 })
  ).filter((p) => p.url !== null);

  const board = planPaareBoard(photos.length);
  const paare: PaarItem[] =
    board.mode === "photos"
      ? photos.slice(0, board.pairs).map((p) => ({
          id: p.id,
          imageUrl: p.url as string,
          alt: p.caption ?? "Familienfoto",
        }))
      : buildEmojiPaare();

  return (
    <section aria-label="Paare finden">
      <h1 className="mb-2 text-2xl font-bold text-anthrazit">Paare finden</h1>
      <p className="mb-6 text-base text-anthrazit/70">
        Decken Sie zwei gleiche Bilder auf. Ganz ohne Eile und ohne Punkte.
      </p>
      <PaareFinden paare={paare} columns={board.columns} />
    </section>
  );
}
