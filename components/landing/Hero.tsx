import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f0fdf4] to-white">
      <div className="mx-auto max-w-5xl px-6 pt-16 sm:pt-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#4CAF87]/10 px-4 py-1.5 text-sm text-[#2e7d5e] font-medium">
          <MapPin className="h-3.5 w-3.5" />
          Pilot-Phase: Alle Features kostenlos
        </div>
        <h1 className="text-4xl font-extrabold leading-tight text-[#2D3142] sm:text-5xl lg:text-6xl">
          Ihr digitaler <span className="text-[#2e7d5e]">Dorfplatz</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
          Die App, die Nachbarschaften verbindet — für Bewohner, Angehörige,
          Pflege und Kommunen.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#357a5d] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#2e7d5e] hover:shadow-xl active:scale-95"
          >
            Kostenlos testen
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#zielgruppen"
            className="inline-flex items-center rounded-xl border-2 border-[#2D3142]/20 px-8 py-4 text-base font-semibold text-[#2D3142] transition-all hover:bg-[#2D3142]/5"
          >
            Mehr erfahren
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-4">
        <div className="overflow-hidden rounded-2xl shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-quartier.webp"
            alt="Zwei Nachbarinnen unterhalten sich in einem deutschen Quartier"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </section>
  );
}
