"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  HeartHandshake,
  Map,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getUserModeConfig,
  USER_UI_MODES,
  type UserUiMode,
} from "@/lib/user-modes";

type ModeStyle = {
  container: string;
  accent: string;
  iconWrap: string;
  icon: LucideIcon;
};

const MODE_STYLES: Record<UserUiMode, ModeStyle> = {
  youth: {
    container: "border-cyan-200/30 bg-[#071923] text-white",
    accent: "bg-lime-300 text-[#071923]",
    iconWrap: "bg-cyan-200/10 text-lime-200",
    icon: Sparkles,
  },
  active: {
    container: "border-quartier-green/30 bg-white text-anthrazit",
    accent: "bg-quartier-green text-white",
    iconWrap: "bg-quartier-green/10 text-quartier-green",
    icon: Map,
  },
  comfort: {
    container: "border-[#cbd8d0] bg-[#f8fbfa] text-anthrazit",
    accent: "bg-[#2d6a4f] text-white",
    iconWrap: "bg-[#dce9e2] text-[#2d6a4f]",
    icon: Bell,
  },
  senior: {
    container: "border-red-200 bg-white text-anthrazit",
    accent: "bg-emergency-red text-white",
    iconWrap: "bg-red-50 text-emergency-red",
    icon: HeartHandshake,
  },
};

type UserModeChoiceCardProps = {
  active?: boolean;
  className?: string;
  disabled?: boolean;
  mode: UserUiMode;
  onSelect?: (mode: UserUiMode) => void;
  variant?: "full" | "compact";
};

function ModeContent({
  active,
  mode,
  variant = "full",
}: Pick<UserModeChoiceCardProps, "active" | "mode" | "variant">) {
  const config = getUserModeConfig(mode);
  const style = MODE_STYLES[mode];
  const Icon = style.icon;
  const surface = config.surface;
  const isCompact = variant === "compact";
  const principles = isCompact ? surface.principles.slice(0, 1) : surface.principles;

  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            style.iconWrap,
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold leading-tight">
              {config.label}
            </span>
            {active && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  style.accent,
                )}
              >
                Aktiv
              </span>
            )}
          </span>
          <span className="mt-1 block text-sm leading-snug opacity-80">
            {surface.title}
          </span>
        </span>
      </div>

      {!isCompact && (
        <p className="mt-3 text-sm leading-6 opacity-80">{surface.subtitle}</p>
      )}

      <ul className="mt-3 flex flex-wrap gap-2">
        {principles.map((principle) => (
          <li
            key={principle}
            className="inline-flex min-h-7 items-center rounded-full border border-current/10 px-2.5 text-xs font-medium opacity-90"
          >
            {principle}
          </li>
        ))}
      </ul>
    </>
  );
}

export function UserModeChoiceCard({
  active = false,
  className,
  disabled = false,
  mode,
  onSelect,
  variant = "full",
}: UserModeChoiceCardProps) {
  const config = getUserModeConfig(mode);
  const style = MODE_STYLES[mode];
  const cardClassName = cn(
    "w-full rounded-lg border p-4 text-left shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-quartier-green/25",
    style.container,
    active && "ring-2 ring-quartier-green/35",
    disabled && "cursor-default opacity-80",
    className,
  );

  if (onSelect) {
    return (
      <button
        type="button"
        aria-label={`${config.label}: ${config.surface.title}`}
        aria-pressed={active}
        className={cardClassName}
        disabled={disabled}
        onClick={() => onSelect(mode)}
      >
        <ModeContent active={active} mode={mode} variant={variant} />
      </button>
    );
  }

  return (
    <div className={cardClassName}>
      <ModeContent active={active} mode={mode} variant={variant} />
    </div>
  );
}

type UserModeFocusStripProps = {
  className?: string;
  mode: UserUiMode;
};

export function UserModeFocusStrip({ className, mode }: UserModeFocusStripProps) {
  const config = getUserModeConfig(mode);
  const surface = config.surface;
  const style = MODE_STYLES[mode];
  const Icon = style.icon;

  return (
    <section
      aria-label={`${config.label}-Oberflaeche`}
      className={cn(
        "rounded-lg border p-4 shadow-sm md:p-5",
        style.container,
        className,
      )}
      data-testid={`user-mode-focus-${mode}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                style.iconWrap,
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            {surface.eyebrow}
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-tight">
            {surface.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">
            {surface.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={surface.primaryAction.href}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold",
              style.accent,
            )}
          >
            {surface.primaryAction.label}
          </Link>
          <Link
            href={surface.secondaryAction.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-current/20 px-4 text-sm font-semibold"
          >
            {surface.secondaryAction.label}
          </Link>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        {surface.principles.map((principle) => (
          <li key={principle} className="flex items-center gap-2 opacity-90">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-quartier-green" />
            <span>{principle}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ModeComparisonPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {USER_UI_MODES.map((mode) => (
        <article
          key={mode}
          data-testid={`user-mode-preview-${mode}`}
          className="min-w-0"
        >
          <UserModeChoiceCard mode={mode} />
        </article>
      ))}
    </div>
  );
}

export function UserModePreviewStack() {
  return (
    <div className="space-y-4">
      {USER_UI_MODES.map((mode) => (
        <UserModeFocusStrip key={mode} mode={mode} />
      ))}
    </div>
  );
}
