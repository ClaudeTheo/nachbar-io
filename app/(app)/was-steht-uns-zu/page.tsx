import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadLeistungenContext } from "@/lib/leistungen/server-data";
import { hasPlusAccess } from "@/lib/leistungen/check-plus";
import { getLeistungenForCountry } from "@/lib/leistungen/content";
import { CURATED_CANTONS, type SwissCanton } from "@/lib/leistungen/types";
import {
  LEISTUNGEN_FLAG_OFF_REDIRECT,
  LEISTUNGEN_PAYWALL_REDIRECT,
} from "@/lib/leistungen/routes";
import { Haftungsausschluss } from "@/components/leistungen/Haftungsausschluss";
import { LeistungenClient } from "@/components/leistungen/LeistungenClient";
import type { KantonsSchalterValue } from "@/components/leistungen/KantonsSchalter";
import { TTSButton } from "@/modules/voice/components/companion/TTSButton";
import { buildLeistungenTts } from "@/lib/leistungen/build-tts";

export const dynamic = "force-dynamic";

export default async function WasStehtUnsZuPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const ctx = await loadLeistungenContext(supabase, auth.user.id);

  if (!ctx.flagEnabled) redirect(LEISTUNGEN_FLAG_OFF_REDIRECT);
  if (!hasPlusAccess(ctx.subscription)) redirect(LEISTUNGEN_PAYWALL_REDIRECT);

  const leistungen = getLeistungenForCountry(ctx.country);
  const newestReviewDate =
    leistungen
      .map((l) => l.lastReviewed)
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 10);

  const cantonHint = ctx.cantonHint;
  const initialCanton: KantonsSchalterValue =
    ctx.country === "CH" &&
    cantonHint &&
    (CURATED_CANTONS as readonly string[]).includes(cantonHint)
      ? (cantonHint as SwissCanton)
      : ctx.country === "CH"
        ? "OTHER"
        : "AG";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Was steht uns zu?</h1>
        <p className="mt-2 text-base text-gray-600">
          Wichtige Pflege-Sozialleistungen für{" "}
          {ctx.country === "DE" ? "Deutschland" : "die Schweiz"} — mit
          offiziellen Quellen.
        </p>
      </header>

      <Haftungsausschluss
        country={ctx.country}
        lastReviewed={newestReviewDate}
      />

      <div className="mb-6">
        <TTSButton text={buildLeistungenTts(ctx.country, leistungen)} />
      </div>

      <LeistungenClient
        leistungen={leistungen}
        initialCanton={initialCanton}
        otherCanton={ctx.country === "CH" ? cantonHint : null}
      />
    </main>
  );
}
