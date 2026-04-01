import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

export function CTASection() {
  return (
    <section className="bg-gradient-to-r from-[#4CAF87] to-[#3d9a73] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center text-white">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Starten Sie Ihr digitales Quartier
        </h2>
        <p className="mt-4 text-base text-white/90">
          Kostenlos in der Pilot-Phase — alle Features, keine Verpflichtung.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#2D3142] shadow-lg transition-all hover:shadow-xl active:scale-95"
          >
            Jetzt registrieren
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:thomasth@gmx.de?subject=QuartierApp%20Anfrage"
            className="inline-flex items-center rounded-xl border-2 border-white/40 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
          >
            <Phone className="mr-2 h-4 w-4" />
            Kontakt für Organisationen
          </a>
        </div>
      </div>
    </section>
  );
}
