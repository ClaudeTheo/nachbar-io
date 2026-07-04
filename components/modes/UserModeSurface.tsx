"use client";

import {
  Bell,
  HeartHandshake,
  Map,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  GENERATION_DESIGN_MODES,
  getGenerationDesign,
} from "@/lib/generation-design";
import { cn } from "@/lib/utils";
import {
  getUserModeConfig,
  USER_UI_MODES,
  type UserUiMode,
} from "@/lib/user-modes";
import {
  GenerationCommunityXpPanel,
  GenerationGuardrailList,
  GenerationModeAction,
  GenerationModeMetric,
  GenerationModeShell,
  GenerationModeTile,
} from "@/components/modes/GenerationModeSurface";

type ModeStyle = {
  icon: LucideIcon;
};

const MODE_STYLES: Record<UserUiMode, ModeStyle> = {
  youth: { icon: Sparkles },
  active: { icon: Map },
  comfort: { icon: Bell },
  senior: { icon: HeartHandshake },
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
  const design = getGenerationDesign(mode);
  const Icon = MODE_STYLES[mode].icon;
  const surface = config.surface;
  const isCompact = variant === "compact";
  const principles = isCompact
    ? surface.principles.slice(0, 1)
    : surface.principles;

  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            design.iconWrapClass,
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
                  design.accentClass,
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
  const design = getGenerationDesign(mode);
  const cardClassName = cn(
    "w-full border p-4 text-left shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-quartier-green/25",
    design.radiusClass,
    design.containerClass,
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

export function UserModeFocusStrip({
  className,
  mode,
}: UserModeFocusStripProps) {
  const config = getUserModeConfig(mode);
  const surface = config.surface;
  const Icon = MODE_STYLES[mode].icon;
  const design = getGenerationDesign(mode);

  return (
    <GenerationModeShell
      actions={
        <>
          <GenerationModeAction href={surface.primaryAction.href} mode={mode}>
            {surface.primaryAction.label}
          </GenerationModeAction>
          <GenerationModeAction
            href={surface.secondaryAction.href}
            mode={mode}
            variant="secondary"
          >
            {surface.secondaryAction.label}
          </GenerationModeAction>
        </>
      }
      className={className}
      eyebrow={surface.eyebrow}
      mode={mode}
      subtitle={surface.subtitle}
      testId={`user-mode-focus-${mode}`}
      title={surface.title}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {design.focus.map((focus) => (
          <GenerationModeTile
            key={focus}
            icon={Icon}
            label={config.label}
            mode={mode}
            value={focus}
          />
        ))}
      </div>
      <div className="mt-4">
        <GenerationGuardrailList mode={mode} />
      </div>
    </GenerationModeShell>
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

export function GenerationModeMatrix() {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {GENERATION_DESIGN_MODES.map((mode) => {
        const config = getUserModeConfig(mode);
        const design = getGenerationDesign(mode);
        const Icon = MODE_STYLES[mode].icon;

        return (
          <GenerationModeShell
            key={mode}
            eyebrow={design.stageLabel}
            mode={mode}
            subtitle={design.preview.subline}
            testId={`generation-mode-matrix-${mode}`}
            title={design.preview.headline}
          >
            <div className="space-y-4">
              <GenerationModeMetric
                label={design.preview.metricLabel}
                mode={mode}
                note={design.preview.metricNote}
                value={design.preview.metricValue}
              />
              {design.communityXp && (
                <GenerationCommunityXpPanel communityXp={design.communityXp} />
              )}
              <div className="grid gap-2">
                {design.focus.map((focus) => (
                  <GenerationModeTile
                    key={focus}
                    icon={Icon}
                    label={config.label}
                    mode={mode}
                    value={focus}
                  />
                ))}
              </div>
              <GenerationGuardrailList mode={mode} />
            </div>
          </GenerationModeShell>
        );
      })}
    </div>
  );
}
