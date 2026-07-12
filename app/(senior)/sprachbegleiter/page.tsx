import Link from "next/link";
import { redirect } from "next/navigation";
import { DialogMode } from "@/modules/voice/components/companion/DialogMode";
import { isRealtimeVoiceEnabled } from "@/lib/ai/realtime-voice";

export default function SeniorRealtimeVoicePage() {
  if (!isRealtimeVoiceEnabled()) redirect("/kreis-start");

  return (
    <section aria-labelledby="sprachbegleiter-title" className="space-y-5">
      <h1
        id="sprachbegleiter-title"
        className="text-center text-3xl font-bold text-anthrazit"
      >
        Mit KI sprechen
      </h1>
      <DialogMode />
      <Link
        href="/kreis-start"
        className="flex w-full items-center justify-center rounded-2xl border-2 border-anthrazit bg-white px-6 text-center text-xl font-bold text-anthrazit"
        style={{ minHeight: "80px", touchAction: "manipulation" }}
      >
        Zurück zur Startseite
      </Link>
    </section>
  );
}
