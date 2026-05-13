"use client";

import { useState } from "react";
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
  const [type, setType] = useState<YouthExchangeType>("swap");
  const [item, setItem] = useState("");
  const [wanted, setWanted] = useState("");
  const [description, setDescription] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [ready, setReady] = useState(false);
  const selectedType = YOUTH_EXCHANGE_TYPES.find((entry) => entry.id === type);
  const canReview = item.trim().length > 0 && acceptedRules;
  const draftTitle = type === "swap" ? "Tausch-Entwurf" : "Verschenk-Entwurf";

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
        className="mt-5 rounded-[24px] border border-cyan-100/18 bg-white/[0.07] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)]"
        aria-labelledby="exchange-draft-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/62">
          Entwurf
        </p>
        <h2 id="exchange-draft-title" className="mt-1 text-xl font-black">
          Sicher vorbereiten
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Art wählen">
          {YOUTH_EXCHANGE_TYPES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-label={`${entry.label} wählen`}
              aria-pressed={type === entry.id}
              onClick={() => {
                setType(entry.id);
                setReady(false);
              }}
              className={`min-h-12 rounded-2xl border px-3 text-sm font-black transition ${
                type === entry.id
                  ? "border-lime-200 bg-lime-300 text-slate-950"
                  : "border-white/12 bg-black/18 text-cyan-50/78"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-cyan-50/86">
              Was gibst du ab?
            </span>
            <input
              value={item}
              onChange={(event) => {
                setItem(event.target.value);
                setReady(false);
              }}
              maxLength={80}
              placeholder="z.B. Comic-Heft"
              className="min-h-12 w-full rounded-2xl border border-cyan-100/18 bg-[#06131c] px-4 text-base font-semibold text-white outline-none transition placeholder:text-cyan-50/34 focus:border-cyan-100/50"
            />
          </label>

          {type === "swap" && (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-cyan-50/86">
                Was suchst du dafür?
              </span>
              <input
                value={wanted}
                onChange={(event) => {
                  setWanted(event.target.value);
                  setReady(false);
                }}
                maxLength={80}
                placeholder="z.B. Kartenspiel"
                className="min-h-12 w-full rounded-2xl border border-cyan-100/18 bg-[#06131c] px-4 text-base font-semibold text-white outline-none transition placeholder:text-cyan-50/34 focus:border-cyan-100/50"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-cyan-50/86">
              Kurz dazu
            </span>
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setReady(false);
              }}
              maxLength={240}
              rows={3}
              placeholder="Zustand, Größe oder was wichtig ist"
              className="w-full rounded-2xl border border-cyan-100/18 bg-[#06131c] px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-cyan-50/34 focus:border-cyan-100/50"
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-lime-100/18 bg-lime-300/10 p-3 text-sm font-semibold leading-6 text-cyan-50/78">
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(event) => {
                setAcceptedRules(event.target.checked);
                setReady(false);
              }}
              className="mt-1 h-4 w-4 rounded border-cyan-100/30"
            />
            <span>Ich teile keine Adresse und kein Geld.</span>
          </label>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/12 bg-black/18 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/58">
            Vorschau
          </p>
          <h3 className="mt-1 text-lg font-black">{draftTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/72">
            {item.trim() || "Noch kein Gegenstand"}
          </p>
          {type === "swap" && (
            <p className="mt-1 text-sm leading-6 text-lime-100/82">
              gegen <span>{wanted.trim() || "noch offen"}</span>
            </p>
          )}
          {description.trim() && (
            <p className="mt-2 text-xs leading-5 text-cyan-50/55">
              {description.trim()}
            </p>
          )}
          <p className="mt-3 text-xs font-semibold text-cyan-50/50">
            {selectedType?.description}
          </p>
        </div>

        {ready && (
          <p className="mt-3 rounded-2xl border border-lime-100/20 bg-lime-300/10 px-3 py-2 text-sm font-semibold text-lime-100">
            Entwurf ist bereit für die spätere Freigabe.
          </p>
        )}

        <button
          type="button"
          disabled={!canReview}
          onClick={() => setReady(true)}
          className="mt-4 min-h-12 w-full rounded-2xl bg-lime-300 px-4 text-sm font-black text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Entwurf prüfen
        </button>
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
