"use client";

import { useId, type SVGProps } from "react";

import {
  getMapActivityPinColorDefinition,
  getMapActivityPinDefinition,
  type MapActivityPinColorState,
  type MapActivityPinType,
} from "@/lib/map-activity-pins";

interface ActivityPinIconProps
  extends Omit<SVGProps<SVGSVGElement>, "type"> {
  type: MapActivityPinType;
  size?: number;
  title?: string;
  colorState?: MapActivityPinColorState;
}

export function ActivityPinIcon({
  type,
  size = 64,
  title,
  colorState,
  className,
  ...svgProps
}: ActivityPinIconProps) {
  const definition = getMapActivityPinDefinition(type);
  const colorDefinition = getMapActivityPinColorDefinition(
    colorState,
    definition.type,
  );
  const rawId = useId().replace(/:/g, "");
  const glowId = `activity-pin-glow-${rawId}`;
  const label = title ?? `${definition.label} auf der Quartierskarte`;
  const height = Math.round((size * 4) / 3);

  return (
    <svg
      {...svgProps}
      role="img"
      aria-label={label}
      className={className}
      data-activity-pin-type={definition.type}
      data-activity-pin-color-state={colorDefinition.state}
      data-category={definition.category}
      width={size}
      height={height}
      viewBox="0 0 96 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{label}</title>
      <defs>
        <filter
          id={glowId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="6"
            floodColor={colorDefinition.color}
            floodOpacity="0.95"
          />
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="16"
            floodColor={colorDefinition.color}
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter={`url(#${glowId})`}>
        <path
          d="M48 4C73 4 92 23 92 48C92 79 65 98 48 124C31 98 4 79 4 48C4 23 23 4 48 4Z"
          fill={colorDefinition.color}
          stroke="white"
          strokeWidth="5.5"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="47" r="30" fill="white" opacity="0.1" />
        <ActivityPinSymbol type={definition.type} />
      </g>
    </svg>
  );
}

function ActivityPinSymbol({ type }: { type: MapActivityPinType }) {
  return (
    <g
      data-activity-pin-symbol={type}
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      transform="translate(48 45)"
    >
      {renderSymbol(type)}
    </g>
  );
}

function renderSymbol(type: MapActivityPinType) {
  switch (type) {
    case "learning":
      return (
        <>
          <path d="M-22 -17C-13 -22 -6 -20 0 -14C6 -20 14 -22 22 -17V18C14 13 7 13 0 20C-7 13 -14 13 -22 18V-17Z" />
          <path d="M0 -14V20" />
        </>
      );
    case "meeting":
      return (
        <>
          <circle cx="-12" cy="-12" r="8" />
          <circle cx="13" cy="-12" r="8" />
          <path d="M-27 18C-24 4 -1 4 2 18" />
          <path d="M2 18C5 4 28 4 31 18" />
        </>
      );
    case "sport":
      return (
        <>
          <circle cx="0" cy="0" r="24" />
          <path d="M-18 -9C-5 -2 5 -2 18 -9" />
          <path d="M-12 18C-5 8 5 8 12 18" />
          <path d="M0 -24V24" />
        </>
      );
    case "mowing":
      return (
        <>
          <path d="M-24 10H12L23 0" />
          <circle cx="-13" cy="17" r="6" />
          <circle cx="14" cy="17" r="6" />
          <path d="M-18 10L-5 -12H12" />
          <path d="M12 -12L27 -28" />
        </>
      );
    case "shopping":
      return (
        <>
          <path d="M-20 -3H20L16 25H-16L-20 -3Z" />
          <path d="M-10 -3C-10 -20 10 -20 10 -3" />
        </>
      );
    case "tech":
      return (
        <>
          <rect x="-15" y="-28" width="30" height="56" rx="8" />
          <path d="M-4 18H4" />
          <path d="M-22 -22L-31 -31" />
          <path d="M22 -22L31 -31" />
        </>
      );
    case "gardening":
      return (
        <>
          <path d="M-2 24C-1 3 8 -19 29 -27C31 -4 16 11 -2 24Z" />
          <path d="M-4 23C-8 2 -18 -14 -31 -20C-31 0 -19 12 -4 23Z" />
          <path d="M-2 24V-12" />
        </>
      );
    case "event":
      return (
        <>
          <rect x="-24" y="-22" width="48" height="44" rx="7" />
          <path d="M-24 -8H24" />
          <path d="M-12 -30V-17" />
          <path d="M12 -30V-17" />
          <path d="M-12 6H-4" />
          <path d="M8 6H16" />
        </>
      );
    case "companion":
      return (
        <>
          <circle cx="-12" cy="-16" r="8" />
          <circle cx="14" cy="-16" r="8" />
          <path d="M-27 24C-22 5 -2 5 2 24" />
          <path d="M2 24C6 5 27 5 31 24" />
          <path d="M-1 4C4 0 9 0 14 4" />
        </>
      );
    case "warning":
      return (
        <>
          <path d="M0 -30L30 24H-30L0 -30Z" />
          <path d="M0 -12V6" />
          <path d="M0 17H0.5" />
        </>
      );
  }
}
