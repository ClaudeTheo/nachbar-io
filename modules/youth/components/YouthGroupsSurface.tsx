import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Trophy,
  UserPlus,
  UsersRound,
} from "lucide-react";

const groupIdeas = [
  {
    title: "Lerngruppe",
    text: "Hausaufgaben, Referate oder zusammen für Tests üben.",
    icon: BookOpen,
  },
  {
    title: "Sport & Spiel",
    text: "Fußball, Basketball, Gaming-Abend oder Bewegung im Quartier.",
    icon: Trophy,
  },
  {
    title: "Hilfe-Team",
    text: "Kleine Einsätze wie Garten, Technik oder Einkaufen abstimmen.",
    icon: ShieldCheck,
  },
] as const;

const privacyRules = [
  "Nur mit Einladung sichtbar.",
  "Gründer oder Admin lädt Mitglieder ein.",
  "Gruppe ist nicht öffentlich auffindbar.",
  "Melden und verlassen ist jederzeit möglich.",
] as const;

export function YouthGroupsSurface() {
  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-5 text-white">
      <Link
        href="/jugend"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 px-3 py-2 text-sm font-bold text-cyan-50/78"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück
      </Link>

      <header className="mt-5 overflow-hidden rounded-[26px] border border-cyan-100/18 bg-[radial-gradient(circle_at_78%_12%,rgba(132,204,22,0.22),transparent_34%),linear-gradient(135deg,rgba(12,35,47,0.98),rgba(6,19,28,0.98))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.34)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/14 text-cyan-100 ring-1 ring-cyan-100/25">
          <UsersRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/65">
          Jugend-Gruppen
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight">
          Geschützte Gruppen
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-cyan-50/72">
          Kleine Gruppen für Lernen, Sport, Treffen oder Hilfe. Niemand kommt
          rein, ohne eingeladen zu werden.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime-300 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(190,242,100,0.28)]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Meine Gruppen
          </Link>
          <Link
            href="/chat-groups/neu"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-100/22 px-5 py-2.5 text-sm font-bold text-cyan-50/86"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Gruppe gründen
          </Link>
        </div>
      </header>

      <section
        className="mt-5 rounded-[22px] border border-cyan-100/18 bg-white/[0.07] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)]"
        aria-labelledby="group-before-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/62">
          Check
        </p>
        <h2 id="group-before-title" className="mt-1 text-xl font-black">
          Vor dem Gründen
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-cyan-50/72">
          <li>Maximal 10 Mitglieder einplanen.</li>
          <li>Einladung weitergeben, statt Gruppen öffentlich zu teilen.</li>
          <li>Nur Menschen aufnehmen, die wirklich dazugehören.</li>
          <li>Melden oder verlassen bleibt jederzeit möglich.</li>
        </ul>
      </section>

      <section className="mt-5 grid gap-3" aria-label="Gruppenideen">
        {groupIdeas.map((idea) => {
          const Icon = idea.icon;
          return (
            <article
              key={idea.title}
              className="rounded-[22px] border border-white/12 bg-white/[0.07] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)]"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-100/24">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black">{idea.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-cyan-50/70">
                    {idea.text}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section
        className="mt-5 rounded-[22px] border border-lime-100/18 bg-lime-300/10 p-4"
        aria-labelledby="groups-rules-title"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/24">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="groups-rules-title" className="text-base font-black">
              Einladung statt offenem Chat
            </h2>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-cyan-50/72">
              {privacyRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
