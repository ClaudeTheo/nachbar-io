import Image from "next/image";
import { cn } from "@/lib/utils";

export type LogoVariant = "symbol" | "full" | "mono";
export type LogoSize = "sm" | "md" | "lg" | number;

// Hoehen-Presets (siehe DESIGN.md / BRAND.md Visual-Polish v7).
const SIZE_HEIGHTS: Record<Exclude<LogoSize, number>, number> = {
  sm: 24,
  md: 40,
  lg: 80,
};

// Aspect-Ratios aus public/brand/ Crops (BRAND.md Stand 2026-05-11).
const VARIANT_RATIOS: Record<LogoVariant, number> = {
  symbol: 820 / 580,
  full: 1380 / 1000,
  mono: 820 / 580, // Fallback auf Symbol-Aspect — dediziertes Mono-PNG offen (BRAND.md Open Question).
};

const VARIANT_SOURCES: Record<LogoVariant, string> = {
  symbol: "/brand/quartierapp-symbol.png",
  full: "/brand/quartierapp-logo.png",
  mono: "/brand/quartierapp-symbol.png", // TODO: dediziertes Mono-Line-Art via Banana Pro 2.
};

const VARIANT_ALT: Record<LogoVariant, string> = {
  symbol: "QuartierApp",
  full: "QuartierApp — Ihr digitales Quartier",
  mono: "QuartierApp",
};

interface QuartierAppLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  /**
   * Setze priority=true wenn das Logo above-the-fold liegt (Hero, Nav-Pill).
   * Bei Footer-Signatur oder Below-the-fold lazy laden.
   */
  priority?: boolean;
}

/**
 * QuartierApp Logo Component (Visual-Polish v7).
 *
 * Variants:
 * - "symbol" — Aquarell-Szene ohne Wordmark (Nav-Pill, Header).
 * - "full" — Symbol + Wordmark + Subtitle + Hairline (Landing, Footer-Signatur).
 * - "mono" — Symbol mit Grayscale-Filter (Fallback bis dediziertes Mono-PNG existiert).
 *
 * Sizes (Hoehe in px, Width wird proportional aus Aspect-Ratio berechnet):
 * - "sm" = 24 px
 * - "md" = 40 px (Default)
 * - "lg" = 80 px
 * - number = beliebige Pixel-Hoehe
 *
 * Specs: docs/plans/handoff/2026-05-11-claude-design-visual-polish-uebergabe.md
 */
export function QuartierAppLogo({
  variant = "symbol",
  size = "md",
  className,
  priority = false,
}: QuartierAppLogoProps) {
  const height = typeof size === "number" ? size : SIZE_HEIGHTS[size];
  const width = Math.round(height * VARIANT_RATIOS[variant]);

  return (
    <Image
      src={VARIANT_SOURCES[variant]}
      alt={VARIANT_ALT[variant]}
      width={width}
      height={height}
      priority={priority}
      className={cn(
        "object-contain select-none",
        variant === "mono" && "grayscale opacity-90",
        className,
      )}
      draggable={false}
    />
  );
}
