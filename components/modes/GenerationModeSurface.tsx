import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  getGenerationDesign,
  type GenerationCommunityXp,
} from "@/lib/generation-design";
import type { UserUiMode } from "@/lib/user-modes";
import { cn } from "@/lib/utils";

interface GenerationModeShellProps {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  eyebrow?: string;
  mode: UserUiMode;
  subtitle: string;
  testId?: string;
  title: string;
}

export function GenerationModeShell({
  actions,
  children,
  className,
  eyebrow,
  mode,
  subtitle,
  testId,
  title,
}: GenerationModeShellProps) {
  const design = getGenerationDesign(mode);

  return (
    <section
      aria-label={`${design.stageLabel}: ${title}`}
      className={cn(
        "relative overflow-hidden border p-5",
        design.radiusClass,
        design.containerClass,
        className,
      )}
      data-generation-mode={mode}
      data-testid={testId}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.12em]",
              design.mutedTextClass,
            )}
          >
            {eyebrow ?? design.stageLabel}
          </p>
          <h2
            className={cn(
              "mt-2 text-2xl font-semibold leading-tight",
              design.textClass,
            )}
          >
            {title}
          </h2>
          <p className={cn("mt-2 max-w-2xl text-sm leading-6", design.mutedTextClass)}>
            {subtitle}
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

interface GenerationModeActionProps {
  children: ReactNode;
  href: string;
  mode: UserUiMode;
  variant?: "primary" | "secondary";
}

export function GenerationModeAction({
  children,
  href,
  mode,
  variant = "primary",
}: GenerationModeActionProps) {
  const design = getGenerationDesign(mode);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold",
        variant === "primary"
          ? design.accentClass
          : "border border-current/20 bg-transparent",
      )}
    >
      {children}
    </Link>
  );
}

interface GenerationModeTileProps {
  href?: string;
  icon: LucideIcon;
  label: string;
  mode: UserUiMode;
  note?: string;
  value: string;
}

export function GenerationModeTile({
  href,
  icon: Icon,
  label,
  mode,
  note,
  value,
}: GenerationModeTileProps) {
  const design = getGenerationDesign(mode);
  const className = cn(
    "flex min-h-[92px] items-start gap-3 border p-4 text-left shadow-sm transition-colors",
    design.radiusClass,
    design.tileClass,
    href && "hover:brightness-[0.98]",
  );
  const content = (
    <>
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          design.iconWrapClass,
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-sm font-semibold", design.textClass)}>
          {label}
        </span>
        <span className={cn("mt-1 block text-base font-semibold", design.textClass)}>
          {value}
        </span>
        {note && (
          <span className={cn("mt-1 block text-xs leading-5", design.mutedTextClass)}>
            {note}
          </span>
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

interface GenerationModeMetricProps {
  label: string;
  mode: UserUiMode;
  note: string;
  value: string;
}

export function GenerationModeMetric({
  label,
  mode,
  note,
  value,
}: GenerationModeMetricProps) {
  const design = getGenerationDesign(mode);

  return (
    <div
      className={cn(
        "border px-4 py-3",
        design.radiusClass,
        design.accentSoftClass,
        design.borderClass,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-75">{note}</p>
    </div>
  );
}

interface GenerationGuardrailListProps {
  mode: UserUiMode;
}

export function GenerationGuardrailList({ mode }: GenerationGuardrailListProps) {
  const design = getGenerationDesign(mode);

  return (
    <ul className="grid gap-2 text-sm md:grid-cols-3">
      {design.guardrails.map((guardrail) => (
        <li
          key={guardrail}
          className={cn(
            "min-h-10 rounded-xl border px-3 py-2 font-medium",
            design.tileClass,
          )}
        >
          {guardrail}
        </li>
      ))}
    </ul>
  );
}

interface GenerationCommunityXpPanelProps {
  communityXp: GenerationCommunityXp;
}

export function GenerationCommunityXpPanel({
  communityXp,
}: GenerationCommunityXpPanelProps) {
  return (
    <div
      className="rounded-[18px] border border-lime-200/24 bg-lime-300/12 p-4 text-lime-50"
      data-testid="community-xp-preview"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime-100/80">
        {communityXp.label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">
        {communityXp.value}
      </p>
      <p className="mt-2 text-sm leading-6 text-lime-50/74">
        {communityXp.note}
      </p>
    </div>
  );
}
