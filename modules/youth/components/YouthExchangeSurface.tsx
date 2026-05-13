import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  LockKeyhole,
  MapPin,
  Repeat2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  YOUTH_EXCHANGE_SAFETY_RULES,
  YOUTH_EXCHANGE_TYPES,
  type YouthExchangeType,
} from "@/modules/youth/services/exchange-rules";

const exchangeIcons: Record<YouthExchangeType, LucideIcon> = {
  swap: Repeat2,
  give: Gift,
};

const exchangeExamples = {
  swap: ["Buch gegen Spiel", "Trikot gegen Hoodie", "Puzzle gegen Comic"],
  give: ["Schulsachen", "Sportzeug", "Pflanzenableger"],
} as const satisfies Record<YouthExchangeType, readonly string[]>;

export function YouthExchangeSurface() {
  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-5 text-white">
      <Link
        href="/jugend"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 px-3 py-2 text-sm font-bold text-cyan-50/78"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück
      </Link>

      <header className="mt-5 overflow-hidden rounded-[26px] border border-cyan-100/18 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.22),transparent_32%),linear-gradient(135deg,rgba(15,40,55,0.98),rgba(6,19,28,0.98))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.34)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/25">
          <Repeat2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/65">
          Jugend-Börse
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight">
          Tauschen & Verschenken
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-cyan-50/72">
          Sachen weitergeben, die noch gut sind. Ohne Verkauf, ohne Zahlung,
          ohne private Adressen.
        </p>
      </header>

      <section className="mt-5 grid gap-3" aria-label="Jugend-Börsenarten">
        {YOUTH_EXCHANGE_TYPES.map((type) => {
          const Icon = exchangeIcons[type.id];
          return (
            <article
              key={type.id}
              className="rounded-[22px] border border-white/12 bg-white/[0.07] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)]"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-100/24">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-white">
                    {type.label}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-cyan-50/70">
                    {type.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {exchangeExamples[type.id].map((example) => (
                      <span
                        key={example}
                        className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-xs font-semibold text-cyan-50/76"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section
        id="regeln"
        className="mt-5 rounded-[22px] border border-lime-100/18 bg-lime-300/10 p-4"
        aria-labelledby="exchange-rules-title"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/24">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="exchange-rules-title" className="text-base font-black">
              Sicher im Quartier
            </h2>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-cyan-50/72">
              {YOUTH_EXCHANGE_SAFETY_RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <Sparkles
                    className="mt-1 h-4 w-4 shrink-0 text-lime-200"
                    aria-hidden="true"
                  />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3" aria-label="Schutzlogik">
        <div className="rounded-[20px] border border-white/12 bg-white/[0.06] p-4">
          <LockKeyhole className="h-5 w-5 text-cyan-100" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-black">Freigabe zuerst</h2>
          <p className="mt-1 text-xs leading-5 text-cyan-50/64">
            Sichtbar wird nur, was Jugend-Regeln und Moderation erlauben.
          </p>
        </div>
        <div className="rounded-[20px] border border-white/12 bg-white/[0.06] p-4">
          <MapPin className="h-5 w-5 text-lime-100" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-black">Treffpunkt statt Adresse</h2>
          <p className="mt-1 text-xs leading-5 text-cyan-50/64">
            Orte bleiben grob oder öffentlich, private Hausdaten bleiben privat.
          </p>
        </div>
      </section>
    </div>
  );
}
