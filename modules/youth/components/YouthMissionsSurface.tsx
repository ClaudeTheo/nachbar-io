"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Gamepad2,
  Handshake,
  Leaf,
  MapPin,
  MessageCircle,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { YouthProfileData } from "@/modules/youth/services/hooks";

interface YouthMissionsSurfaceProps {
  profile: YouthProfileData | null;
  taskSlot?: ReactNode;
  preview?: boolean;
}

interface MissionTemplate {
  title: string;
  text: string;
  points: string;
  icon: LucideIcon;
  accent: string;
  kind: string;
}

const missionTemplates: MissionTemplate[] = [
  {
    title: "Lern-Crew",
    text: "Zusammen Hausaufgaben, Referat oder Prüfung vorbereiten.",
    points: "+35",
    icon: BookOpen,
    accent: "bg-cyan-300/14 text-cyan-100 ring-cyan-100/25",
    kind: "Lernen",
  },
  {
    title: "Sport & Spiel",
    text: "Kicken, Basketball, Tischtennis oder Bewegung im Quartier.",
    points: "+20",
    icon: Trophy,
    accent: "bg-amber-300/14 text-amber-100 ring-amber-100/25",
    kind: "Treffen",
  },
  {
    title: "Garten-Help",
    text: "Rasen, Beet, Pflanzen oder kleine Hilfe draußen.",
    points: "+45",
    icon: Leaf,
    accent: "bg-lime-300/14 text-lime-100 ring-lime-100/25",
    kind: "Hilfe",
  },
  {
    title: "Tausch-Move",
    text: "Etwas weitergeben, tauschen oder verschenken ohne Geld.",
    points: "+15",
    icon: Repeat2,
    accent: "bg-violet-300/14 text-violet-100 ring-violet-100/25",
    kind: "Tauschen",
  },
];

const missionRules = [
  "Pins zeigen nur, was du sehen darfst.",
  "Private Adressen bleiben privat.",
  "Rot bleibt Notfall oder Unfall.",
  "Gruppen und Chats nur mit Einladung.",
] as const;

function MissionTemplateCard({ mission }: { mission: MissionTemplate }) {
  const Icon = mission.icon;

  return (
    <article className="rounded-[22px] border border-white/12 bg-white/[0.075] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.24)]">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${mission.accent}`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/58">
                {mission.kind}
              </p>
              <h2 className="mt-1 text-xl font-black text-white">
                {mission.title}
              </h2>
            </div>
            <span className="rounded-full bg-lime-300 px-3 py-1 text-sm font-black text-slate-950">
              {mission.points}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-cyan-50/72">
            {mission.text}
          </p>
        </div>
      </div>
    </article>
  );
}

function MissionRuleList() {
  return (
    <section
      className="rounded-[22px] border border-lime-100/18 bg-lime-300/10 p-4"
      aria-labelledby="mission-rules-title"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/24">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="mission-rules-title" className="text-base font-black">
            Safe by Design
          </h2>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-cyan-50/72">
            {missionRules.map((rule) => (
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
  );
}

export function YouthMissionsSurface({
  profile,
  taskSlot,
  preview = false,
}: YouthMissionsSurfaceProps) {
  const points = profile?.total_points ?? 0;

  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-5 text-white">
      <Link
        href="/jugend"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/14 px-3 py-2 text-sm font-bold text-cyan-50/78"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück
      </Link>

      <header className="mt-5 overflow-hidden rounded-[28px] border border-cyan-100/18 bg-[radial-gradient(circle_at_80%_8%,rgba(132,204,22,0.28),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.2),transparent_32%),linear-gradient(135deg,rgba(12,35,47,0.98),rgba(6,19,28,0.98))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/25">
            <Gamepad2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="rounded-2xl border border-white/12 bg-black/18 px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/58">
              Score
            </p>
            <p className="text-xl font-black text-lime-200">{points}</p>
          </div>
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/65">
          Jugend-Missionen
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight">
          Mach was draus.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-cyan-50/72">
          Lernen, treffen, helfen und Punkte sammeln. Alles bleibt im Quartier,
          sichtbar nur für die richtigen Leute.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-[18px] border border-cyan-100/16 bg-cyan-300/10 px-3 py-3">
            <MapPin className="h-4 w-4 text-cyan-100" aria-hidden="true" />
            <p className="mt-2 text-xs font-black text-white">Map-Pin</p>
            <p className="mt-1 text-[11px] leading-4 text-cyan-50/58">
              Ort passend zur Mission
            </p>
          </div>
          <div className="rounded-[18px] border border-lime-100/16 bg-lime-300/10 px-3 py-3">
            <Handshake className="h-4 w-4 text-lime-100" aria-hidden="true" />
            <p className="mt-2 text-xs font-black text-white">Team</p>
            <p className="mt-1 text-[11px] leading-4 text-cyan-50/58">
              Allein oder Gruppe
            </p>
          </div>
          <div className="rounded-[18px] border border-amber-100/16 bg-amber-300/10 px-3 py-3">
            <MessageCircle className="h-4 w-4 text-amber-100" aria-hidden="true" />
            <p className="mt-2 text-xs font-black text-white">Chat</p>
            <p className="mt-1 text-[11px] leading-4 text-cyan-50/58">
              Nur mit Einladung
            </p>
          </div>
        </div>
      </header>

      <section className="mt-5 space-y-3" aria-labelledby="mission-ideas-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-100/62">
              Mission-Typen
            </p>
            <h2 id="mission-ideas-title" className="text-xl font-black">
              Was hier passieren kann
            </h2>
          </div>
          <Link
            href="/jugend/gruppen"
            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-cyan-100/20 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-100/45"
          >
            Gruppen
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3">
          {missionTemplates.map((mission) => (
            <MissionTemplateCard key={mission.title} mission={mission} />
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-3" aria-labelledby="live-missions-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/62">
              Live
            </p>
            <h2 id="live-missions-title" className="text-xl font-black">
              Offene Missionen
            </h2>
          </div>
        </div>
        {taskSlot}
      </section>

      <div className="mt-5">
        <MissionRuleList />
      </div>

      {preview && (
        <p className="mt-5 text-center text-xs text-cyan-50/45">
          Lokale Vorschau mit Beispiel-Missionen und ohne Prod-Schreibzugriff.
        </p>
      )}
    </div>
  );
}
