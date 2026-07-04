"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Gift,
  Map,
  Medal,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { YouthProfileData } from "@/modules/youth/services/hooks";

interface YouthHomeSurfaceProps {
  profile: YouthProfileData | null;
  mapSlot?: ReactNode;
  taskSlot?: ReactNode;
  preview?: boolean;
  guardianLinked?: boolean;
}

interface YouthAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const youthActions: YouthAction[] = [
  {
    href: "/jugend/aufgaben",
    label: "Missionen",
    description: "Lernen, helfen, treffen",
    icon: ClipboardList,
    accent: "text-lime-200 bg-lime-300/14 ring-lime-200/30",
  },
  {
    href: "/map",
    label: "Karte",
    description: "Pins, Treffen, Hilfe",
    icon: Map,
    accent: "text-cyan-200 bg-cyan-300/14 ring-cyan-200/30",
  },
  {
    href: "/jugend/badges",
    label: "Badges",
    description: "Deine Erfolge",
    icon: Medal,
    accent: "text-amber-200 bg-amber-300/14 ring-amber-200/30",
  },
  {
    href: "/jugend/tauschen",
    label: "Tauschen",
    description: "Nur tauschen & schenken",
    icon: Repeat2,
    accent: "text-violet-100 bg-violet-300/14 ring-violet-100/25",
  },
  {
    href: "/jugend/gruppen",
    label: "Gruppen",
    description: "Einladung statt offen",
    icon: UsersRound,
    accent: "text-rose-100 bg-rose-300/14 ring-rose-100/25",
  },
];

const youthMoments = [
  { label: "Lernen", icon: BookOpen },
  { label: "Treffen", icon: UsersRound },
  { label: "Schenken", icon: Gift },
  { label: "Sport", icon: Trophy },
  { label: "Events", icon: CalendarDays },
] as const;

function getAgeLabel(profile: YouthProfileData) {
  return profile.age_group === "u16" ? "U16" : "16-17";
}

function getAccessLabel(profile: YouthProfileData) {
  switch (profile.access_level) {
    case "freigeschaltet":
      return "Freigeschaltet";
    case "erweitert":
      return "Erweitert";
    case "basis":
    default:
      return "Basis";
  }
}

function YouthNoProfile() {
  return (
    <section className="relative z-10 px-4 pb-10 pt-4">
      <div className="rounded-[24px] border border-cyan-200/20 bg-white/[0.08] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/75">
          Jugendmodus
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Dein Quartier wartet.
        </h2>
        <p className="mt-2 text-sm leading-6 text-cyan-50/78">
          Mit Invite und Freigabe bekommst du die Jugendansicht für Lernen,
          Treffen, Aufgaben und sichere Quartier-Pins.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(190,242,100,0.34)] transition hover:bg-lime-200"
          >
            Zugang starten
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/45"
          >
            Einloggen
          </Link>
        </div>
      </div>
    </section>
  );
}

function YouthActionTile({ action }: { action: YouthAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="group min-h-[116px] rounded-[20px] border border-white/12 bg-white/[0.07] p-4 text-left shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-100/40 hover:bg-white/[0.11]"
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${action.accent}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="mt-3 flex items-center justify-between gap-3">
        <span>
          <span className="block text-base font-bold text-white">
            {action.label}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-cyan-50/68">
            {action.description}
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-cyan-100/55 transition group-hover:translate-x-0.5 group-hover:text-cyan-100"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function YouthProfileStrip({ profile }: { profile: YouthProfileData }) {
  return (
    <section className="grid grid-cols-3 gap-2" aria-label="Jugend-Status">
      <div className="rounded-[18px] border border-lime-200/20 bg-lime-300/12 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-lime-100/80">
          Punkte
        </p>
        <p className="mt-1 text-2xl font-black text-white">
          {profile.total_points ?? 0}
        </p>
      </div>
      <div className="rounded-[18px] border border-cyan-200/18 bg-cyan-300/10 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100/78">
          Stufe
        </p>
        <p className="mt-1 text-sm font-bold text-white">
          {getAccessLabel(profile)}
        </p>
      </div>
      <div className="rounded-[18px] border border-amber-200/18 bg-amber-300/10 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100/78">
          Alter
        </p>
        <p className="mt-1 text-sm font-bold text-white">
          {getAgeLabel(profile)}
        </p>
      </div>
    </section>
  );
}

export function YouthHomeSurface({
  profile,
  mapSlot,
  taskSlot,
  preview = false,
  guardianLinked = false,
}: YouthHomeSurfaceProps) {
  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#071923] pb-10 text-white">
      <section className="relative isolate min-h-[252px] px-4 pb-5 pt-5">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-95"
          style={{
            backgroundImage:
              "url('/brand/generation-modes/youth-social-neighborhood-hero-mobile-header.webp')",
            backgroundPosition: "35% center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,15,23,0.94)_0%,rgba(4,15,23,0.72)_44%,rgba(4,15,23,0.2)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-[#071923] to-transparent" />

        <div className="relative flex min-h-[220px] flex-col justify-end">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100/20 bg-black/26 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/82 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            QuartierApp Jugend
          </div>
          <h1 className="max-w-[13ch] text-[2.35rem] font-black leading-[0.96] text-white sm:text-5xl">
            Deine Quartier-Quest.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-cyan-50/80">
            Lernen, treffen, helfen und sehen, was direkt um dich herum
            passiert.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {youthMoments.map((moment) => {
              const Icon = moment.icon;
              return (
                <span
                  key={moment.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {moment.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {!profile ? (
        <YouthNoProfile />
      ) : (
        <div className="relative z-10 space-y-6 px-4">
          <YouthProfileStrip profile={profile} />

          <section
            className="space-y-3"
            data-testid="youth-map-section"
            aria-labelledby="youth-map-title"
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/65">
                  Live im Quartier
                </p>
                <h2 id="youth-map-title" className="text-xl font-black">
                  Was läuft gerade?
                </h2>
              </div>
              <Link
                href="/map"
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-cyan-100/20 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-100/45"
              >
                Groß öffnen
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-cyan-100/20 bg-[#06131c] p-2 shadow-[0_26px_90px_rgba(0,0,0,0.38)]">
              {mapSlot}
            </div>
          </section>

          <section
            className="grid grid-cols-2 gap-3"
            aria-label="Schnellzugriffe"
          >
            {youthActions.map((action) => (
              <YouthActionTile key={action.href} action={action} />
            ))}
            {guardianLinked && (
              <YouthActionTile
                action={{
                  href: "/jugend/freunde/einladen",
                  label: "Freund einladen",
                  description: "Eltern geben frei",
                  icon: UsersRound,
                  accent: "text-cyan-100 bg-cyan-300/14 ring-cyan-100/25",
                }}
              />
            )}
          </section>

          <section className="space-y-3" aria-labelledby="youth-tasks-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-100/62">
                  Heute möglich
                </p>
                <h2 id="youth-tasks-title" className="text-xl font-black">
                  Missionen & Treffen
                </h2>
              </div>
              <Link
                href="/jugend/aufgaben"
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-lime-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-lime-200"
              >
                Alle
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            {taskSlot}
          </section>

          <section className="rounded-[22px] border border-white/12 bg-white/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-100/25">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-black text-white">
                  Jugend-sicher sichtbar
                </h2>
                <p className="mt-1 text-sm leading-6 text-cyan-50/70">
                  Pins zeigen nur, was für deinen Modus freigegeben ist. Private
                  Senior- oder Care-Daten bleiben draußen.
                </p>
              </div>
            </div>
          </section>

          {preview && (
            <p className="text-center text-xs text-cyan-50/45">
              Lokale Vorschau mit Beispielprofil und anonymisierten Pins.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
