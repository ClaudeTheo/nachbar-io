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
      strokeWidth="4.4"
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
          <path data-detail="book-left" d="M-27 -20C-17 -25 -8 -21 0 -14V22C-8 15 -18 13 -27 18V-20Z" />
          <path data-detail="book-right" d="M0 -14C8 -21 17 -25 27 -20V18C18 13 8 15 0 22V-14Z" />
          <path data-detail="book-spine" d="M0 -14V22" />
          <path data-detail="page-line" d="M-20 -7C-13 -10 -7 -9 -3 -5" />
          <path data-detail="pencil" d="M11 7L28 24" />
          <path data-detail="pencil-tip" d="M28 24L31 16" />
        </>
      );
    case "meeting":
      return (
        <>
          <circle data-detail="left-person" cx="-17" cy="-12" r="7" />
          <circle data-detail="third-person" cx="0" cy="-19" r="6" />
          <circle data-detail="right-person" cx="17" cy="-12" r="7" />
          <path data-detail="left-body" d="M-30 19C-26 4 -10 4 -6 19" />
          <path data-detail="center-body" d="M-13 18C-10 5 10 5 13 18" />
          <path data-detail="right-body" d="M6 19C10 4 26 4 30 19" />
          <path data-detail="chat-line" d="M-19 27H12L21 34" />
        </>
      );
    case "sport":
      return (
        <>
          <circle data-detail="ball" cx="-1" cy="0" r="21" />
          <path data-detail="ball-panel" d="M-1 -21V21" />
          <path data-detail="ball-panel" d="M-18 -8C-8 -2 6 -2 16 -8" />
          <path data-detail="ball-panel" d="M-15 15C-8 8 6 8 13 15" />
          <path data-detail="motion-kick" d="M-30 23C-19 15 -9 14 0 21" />
          <path data-detail="motion-kick" d="M19 -20L30 -28" />
        </>
      );
    case "mowing":
      return (
        <>
          <path data-detail="mower-deck" d="M-27 9H12L25 -2" />
          <path data-detail="blade" d="M-21 2H1" />
          <circle data-detail="wheel" cx="-15" cy="18" r="6" />
          <circle data-detail="wheel" cx="13" cy="18" r="6" />
          <path data-detail="mower-handle" d="M-19 9L-6 -14H13L29 -30" />
          <path data-detail="grass-cut" d="M-31 27H-22" />
          <path data-detail="grass-cut" d="M-3 27H8" />
          <path data-detail="grass-cut" d="M21 27H31" />
        </>
      );
    case "shopping":
      return (
        <>
          <path data-detail="shopping-bag" d="M-22 -3H22L18 27H-18L-22 -3Z" />
          <path data-detail="bag-handle" d="M-11 -3C-11 -21 11 -21 11 -3" />
          <path data-detail="box-item" d="M-10 7H10" />
          <path data-detail="box-item" d="M-7 17H7" />
          <path data-detail="receipt" d="M17 -12L27 -20" />
        </>
      );
    case "tech":
      return (
        <>
          <rect data-detail="phone" x="-15" y="-25" width="30" height="52" rx="8" />
          <path data-detail="phone-screen" d="M-6 -14H6" />
          <path data-detail="phone-screen" d="M-7 -2H7" />
          <path data-detail="home-line" d="M-4 18H4" />
          <path data-detail="wifi-signal" d="M-30 -20C-21 -30 -8 -34 5 -30" />
          <path data-detail="wifi-signal" d="M-25 -9C-18 -17 -8 -20 2 -16" />
        </>
      );
    case "gardening":
      return (
        <>
          <path data-detail="leaf-pair" d="M-2 19C0 0 10 -19 30 -27C30 -5 16 9 -2 19Z" />
          <path data-detail="leaf-pair" d="M-4 20C-8 1 -18 -12 -31 -18C-30 1 -18 12 -4 20Z" />
          <path data-detail="stem" d="M-3 24V-13" />
          <path data-detail="soil-line" d="M-26 27C-13 22 12 22 26 27" />
          <path data-detail="sprout" d="M-3 4C6 1 12 -2 17 -9" />
        </>
      );
    case "event":
      return (
        <>
          <rect data-detail="calendar" x="-25" y="-22" width="50" height="44" rx="7" />
          <path data-detail="calendar-top" d="M-25 -8H25" />
          <path data-detail="calendar-ring" d="M-13 -30V-17" />
          <path data-detail="calendar-ring" d="M13 -30V-17" />
          <path data-detail="calendar-grid" d="M-13 5H-5" />
          <path data-detail="calendar-grid" d="M6 5H14" />
          <path data-detail="star" d="M0 11L3 17L10 18L5 23L6 30L0 26L-6 30L-5 23L-10 18L-3 17L0 11Z" />
        </>
      );
    case "companion":
      return (
        <>
          <circle data-detail="person-a" cx="-14" cy="-17" r="7" />
          <circle data-detail="person-b" cx="15" cy="-15" r="7" />
          <path data-detail="body-a" d="M-29 20C-25 4 -5 4 -1 20" />
          <path data-detail="body-b" d="M1 22C5 5 26 5 30 22" />
          <path data-detail="help-hand" d="M-3 3C3 8 10 8 16 2" />
          <path data-detail="path-line" d="M-30 31C-14 25 7 25 30 31" />
        </>
      );
    case "warning":
      return (
        <>
          <path data-detail="warning-triangle" d="M0 -31L31 24H-31L0 -31Z" />
          <path data-detail="exclamation" d="M0 -13V6" />
          <path data-detail="exclamation" d="M0 17H0.5" />
          <path data-detail="warning-rays" d="M-25 -25L-32 -32" />
          <path data-detail="warning-rays" d="M25 -25L32 -32" />
          <path data-detail="warning-rays" d="M0 -39V-31" />
        </>
      );
  }
}
