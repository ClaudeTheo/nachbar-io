"use client";

import { useState } from "react";

// ============================================================
// iPhone-Style Wetter-Widget Demo v2 — Professionell + Detailliert
// ============================================================

// Wetter-Zustaende mit CSS-Gradient-Strings (inline styles fuer Zuverlaessigkeit)
const WEATHER_PRESETS = {
  "sunny-day": {
    label: "Sonnig (Tag)",
    gradient: "linear-gradient(180deg, #47ABDE 0%, #4A90D9 40%, #2171B5 100%)",
    temp: 22,
    desc: "Sonnig",
    feelsLike: 24,
    humidity: 45,
    wind: 12,
    uv: 6,
    icon: "sun",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.7)",
    forecast: [
      { day: "Di", icon: "sun", high: 24, low: 14 },
      { day: "Mi", icon: "cloud-sun", high: 20, low: 12 },
      { day: "Do", icon: "rain", high: 16, low: 10 },
    ],
    hourly: [
      { time: "Jetzt", temp: 22, icon: "sun" },
      { time: "14", temp: 24, icon: "sun" },
      { time: "15", temp: 23, icon: "cloud-sun" },
      { time: "16", temp: 21, icon: "cloud-sun" },
      { time: "17", temp: 19, icon: "cloud" },
      { time: "18", temp: 17, icon: "sunset" },
    ],
  },
  "cloudy-day": {
    label: "Bewölkt",
    gradient: "linear-gradient(180deg, #8E9EAB 0%, #7B8D9E 40%, #636E78 100%)",
    temp: 15,
    desc: "Bewölkt",
    feelsLike: 13,
    humidity: 68,
    wind: 18,
    uv: 2,
    icon: "cloud",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.65)",
    forecast: [
      { day: "Di", icon: "cloud", high: 16, low: 10 },
      { day: "Mi", icon: "rain", high: 13, low: 8 },
      { day: "Do", icon: "cloud-sun", high: 18, low: 11 },
    ],
    hourly: [
      { time: "Jetzt", temp: 15, icon: "cloud" },
      { time: "14", temp: 15, icon: "cloud" },
      { time: "15", temp: 14, icon: "cloud" },
      { time: "16", temp: 13, icon: "rain" },
      { time: "17", temp: 12, icon: "rain" },
      { time: "18", temp: 11, icon: "cloud" },
    ],
  },
  rain: {
    label: "Regen",
    gradient: "linear-gradient(180deg, #4B5563 0%, #57606B 35%, #3B4754 100%)",
    temp: 11,
    desc: "Regenschauer",
    feelsLike: 8,
    humidity: 89,
    wind: 24,
    uv: 1,
    icon: "rain",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.6)",
    forecast: [
      { day: "Di", icon: "rain", high: 12, low: 7 },
      { day: "Mi", icon: "cloud", high: 14, low: 9 },
      { day: "Do", icon: "sun", high: 19, low: 11 },
    ],
    hourly: [
      { time: "Jetzt", temp: 11, icon: "rain" },
      { time: "14", temp: 10, icon: "rain" },
      { time: "15", temp: 10, icon: "rain" },
      { time: "16", temp: 11, icon: "cloud" },
      { time: "17", temp: 11, icon: "cloud" },
      { time: "18", temp: 10, icon: "cloud" },
    ],
  },
  snow: {
    label: "Schnee",
    gradient: "linear-gradient(180deg, #B8C6DB 0%, #A8B8CC 40%, #8FA0B5 100%)",
    temp: -2,
    desc: "Leichter Schneefall",
    feelsLike: -6,
    humidity: 92,
    wind: 15,
    uv: 1,
    icon: "snow",
    textColor: "#2D3142",
    subColor: "rgba(45,49,66,0.6)",
    forecast: [
      { day: "Di", icon: "snow", high: 0, low: -5 },
      { day: "Mi", icon: "cloud", high: 3, low: -2 },
      { day: "Do", icon: "sun", high: 6, low: 0 },
    ],
    hourly: [
      { time: "Jetzt", temp: -2, icon: "snow" },
      { time: "14", temp: -1, icon: "snow" },
      { time: "15", temp: -1, icon: "snow" },
      { time: "16", temp: -2, icon: "cloud" },
      { time: "17", temp: -3, icon: "cloud" },
      { time: "18", temp: -4, icon: "moon" },
    ],
  },
  "clear-night": {
    label: "Klare Nacht",
    gradient: "linear-gradient(180deg, #0F1B2D 0%, #152238 40%, #1A2744 70%, #0D1520 100%)",
    temp: 8,
    desc: "Klare Nacht",
    feelsLike: 6,
    humidity: 72,
    wind: 8,
    uv: 0,
    icon: "moon",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.5)",
    forecast: [
      { day: "Di", icon: "sun", high: 18, low: 8 },
      { day: "Mi", icon: "cloud-sun", high: 16, low: 9 },
      { day: "Do", icon: "rain", high: 13, low: 7 },
    ],
    hourly: [
      { time: "Jetzt", temp: 8, icon: "moon" },
      { time: "22", temp: 7, icon: "moon" },
      { time: "23", temp: 6, icon: "moon" },
      { time: "00", temp: 5, icon: "moon" },
      { time: "01", temp: 4, icon: "moon" },
      { time: "02", temp: 4, icon: "moon" },
    ],
  },
  sunset: {
    label: "Abendrot",
    gradient: "linear-gradient(180deg, #2D1B69 0%, #B44593 30%, #F09819 65%, #FF512F 100%)",
    temp: 17,
    desc: "Abendrot",
    feelsLike: 18,
    humidity: 55,
    wind: 10,
    uv: 1,
    icon: "sunset",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.7)",
    forecast: [
      { day: "Di", icon: "sun", high: 20, low: 12 },
      { day: "Mi", icon: "cloud", high: 17, low: 10 },
      { day: "Do", icon: "rain", high: 14, low: 9 },
    ],
    hourly: [
      { time: "Jetzt", temp: 17, icon: "sunset" },
      { time: "20", temp: 15, icon: "moon" },
      { time: "21", temp: 13, icon: "moon" },
      { time: "22", temp: 11, icon: "moon" },
      { time: "23", temp: 10, icon: "moon" },
      { time: "00", temp: 9, icon: "moon" },
    ],
  },
  storm: {
    label: "Gewitter",
    gradient: "linear-gradient(180deg, #1a1a2e 0%, #2d2d44 30%, #3d3d5c 60%, #16213e 100%)",
    temp: 14,
    desc: "Gewitter mit Regen",
    feelsLike: 11,
    humidity: 95,
    wind: 38,
    uv: 0,
    icon: "storm",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.5)",
    forecast: [
      { day: "Di", icon: "rain", high: 15, low: 10 },
      { day: "Mi", icon: "cloud", high: 17, low: 11 },
      { day: "Do", icon: "sun", high: 21, low: 13 },
    ],
    hourly: [
      { time: "Jetzt", temp: 14, icon: "storm" },
      { time: "14", temp: 13, icon: "storm" },
      { time: "15", temp: 13, icon: "rain" },
      { time: "16", temp: 14, icon: "rain" },
      { time: "17", temp: 14, icon: "cloud" },
      { time: "18", temp: 13, icon: "cloud" },
    ],
  },
} as const;

type WeatherKey = keyof typeof WEATHER_PRESETS;

// ── Detaillierte Bad Saeckingen Silhouette v3 ──
function SkylineSilhouette({
  isDark,
}: {
  isDark: boolean;
  textColor: string;
}) {
  const fill = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.10)";
  const fillLight = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";
  const fillDark = isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.14)";
  const stroke = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)";
  const strokeLight = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";
  const water = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const waterDeep = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const windowGlow = isDark ? "rgba(255,200,60,0.30)" : "rgba(255,200,60,0.08)";
  const windowGlowBright = isDark ? "rgba(255,210,80,0.45)" : "rgba(0,0,0,0.03)";

  return (
    <svg
      viewBox="0 0 800 240"
      className="absolute bottom-0 left-0 w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* ═══ HINTERGRUND: Schwarzwald-Berge ═══ */}
      {/* Ferne Bergkette */}
      <path
        d="M0,155 Q30,120 70,140 Q110,105 150,125 Q190,90 240,115 Q280,80 330,108 Q370,75 420,100 Q460,70 510,95 Q550,78 590,98 Q630,82 670,105 Q710,88 750,110 Q780,95 800,120 L800,240 L0,240 Z"
        fill={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}
      />
      {/* Nahe Bergkette */}
      <path
        d="M0,168 Q50,140 100,155 Q140,130 190,148 Q230,125 280,145 Q320,130 360,150 Q400,135 440,152 Q480,138 520,150 Q560,135 610,148 Q650,132 700,150 Q740,138 780,155 Q800,148 800,160 L800,240 L0,240 Z"
        fill={fillLight}
      />

      {/* ═══ LINKS: Bergsee-Gebiet + Tannenwald ═══ */}
      <path
        d="M0,178 Q20,165 50,172 Q80,158 110,168 Q130,155 155,164 Q175,155 195,162 L195,240 L0,240 Z"
        fill={fill}
      />
      {/* Tannen (mehrstufig fuer Tiefe) */}
      {[
        { x: 15, y: 170, h: 16 }, { x: 30, y: 165, h: 18 }, { x: 48, y: 168, h: 15 },
        { x: 65, y: 160, h: 20 }, { x: 80, y: 164, h: 17 }, { x: 95, y: 158, h: 22 },
        { x: 112, y: 162, h: 18 }, { x: 128, y: 156, h: 20 }, { x: 145, y: 160, h: 17 },
        { x: 162, y: 158, h: 19 }, { x: 178, y: 162, h: 16 },
      ].map((t) => (
        <g key={`tree-${t.x}`}>
          {/* Stamm */}
          <rect x={t.x - 1} y={t.y} width={2} height={5} fill={fillDark} />
          {/* 3 Schichten Nadeln */}
          <polygon points={`${t.x},${t.y - t.h} ${t.x - 5},${t.y - 2} ${t.x + 5},${t.y - 2}`} fill={fill} />
          <polygon points={`${t.x},${t.y - t.h + 4} ${t.x - 4},${t.y - 5} ${t.x + 4},${t.y - 5}`} fill={fillDark} />
          <polygon points={`${t.x},${t.y - t.h + 8} ${t.x - 3},${t.y - 8} ${t.x + 3},${t.y - 8}`} fill={fill} />
        </g>
      ))}

      {/* ═══ MUENSTER ST. FRIDOLIN (Detail) ═══ */}
      <g>
        {/* Kirchenschiff — Seitenschiffe */}
        <rect x="195" y="143" width="12" height="32" fill={fill} />
        <rect x="247" y="143" width="12" height="32" fill={fill} />
        {/* Hauptschiff */}
        <rect x="200" y="138" width="55" height="37" fill={fillDark} />
        {/* Dach Hauptschiff */}
        <polygon points="198,138 227,122 258,138" fill={fill} />
        {/* Dachziegel-Linien */}
        {[126, 129, 132, 135].map((y) => (
          <line key={`roof-${y}`} x1={200 + (y - 122) * 1.8} y1={y} x2={256 - (y - 122) * 1.8} y2={y} stroke={strokeLight} strokeWidth="0.5" />
        ))}

        {/* Hauptturm (barock, mit Zwiebeldach) */}
        <rect x="218" y="80" width="18" height="60" fill={fillDark} />
        {/* Turm-Gesimse */}
        <rect x="216" y="95" width="22" height="2" fill={fill} />
        <rect x="216" y="110" width="22" height="2" fill={fill} />
        {/* Zwiebeldach */}
        <ellipse cx="227" cy="80" rx="12" ry="7" fill={fillDark} />
        <ellipse cx="227" cy="78" rx="9" ry="5" fill={fill} />
        {/* Laterne (kleiner Aufsatz) */}
        <rect x="224" y="68" width="6" height="10" fill={fill} />
        <ellipse cx="227" cy="68" rx="5" ry="3" fill={fillDark} />
        {/* Spitze */}
        <polygon points="227,50 223,68 231,68" fill={fill} />
        {/* Kugel + Kreuz */}
        <circle cx="227" cy="50" r="2" fill={fillDark} />
        <line x1="227" y1="48" x2="227" y2="40" stroke={stroke} strokeWidth="1.5" />
        <line x1="223" y1="44" x2="231" y2="44" stroke={stroke} strokeWidth="1.5" />

        {/* Turm-Fenster (Schallarkaden) */}
        {[84, 88, 92].map((y) => (
          <g key={`tf-${y}`}>
            <rect x="221" y={y} width="3" height="5" rx="1.5" fill={windowGlow} />
            <rect x="226" y={y} width="3" height="5" rx="1.5" fill={windowGlow} />
            <rect x="231" y={y} width="3" height="5" rx="1.5" fill={windowGlow} />
          </g>
        ))}
        {/* Turmuhren */}
        <circle cx="227" cy="103" r="4" fill="none" stroke={stroke} strokeWidth="1" />
        <line x1="227" y1="103" x2="227" y2="100" stroke={stroke} strokeWidth="1" />
        <line x1="227" y1="103" x2="229" y2="104" stroke={stroke} strokeWidth="0.8" />

        {/* Rosettenfenster (gross, rund) */}
        <circle cx="227" cy="148" r="6" fill="none" stroke={stroke} strokeWidth="1.2" />
        <circle cx="227" cy="148" r="3" fill="none" stroke={strokeLight} strokeWidth="0.8" />
        {/* Rosetten-Speichen */}
        {[0, 45, 90, 135].map((angle) => (
          <line
            key={`spoke-${angle}`}
            x1={227 + Math.cos((angle * Math.PI) / 180) * 3}
            y1={148 + Math.sin((angle * Math.PI) / 180) * 3}
            x2={227 + Math.cos((angle * Math.PI) / 180) * 6}
            y2={148 + Math.sin((angle * Math.PI) / 180) * 6}
            stroke={strokeLight}
            strokeWidth="0.6"
          />
        ))}

        {/* Kirchenfenster (Spitzbogen) */}
        {[205, 212, 240, 247].map((fx) => (
          <g key={`cw-${fx}`}>
            <rect x={fx} y="150" width="4" height="10" fill={windowGlow} />
            <path d={`M${fx},150 Q${fx + 2},146 ${fx + 4},150`} fill={windowGlow} />
          </g>
        ))}

        {/* Portal (Eingang) */}
        <rect x="222" y="163" width="10" height="12" fill={fillDark} />
        <path d="M222,163 Q227,157 232,163" fill={fillDark} />

        {/* Strebepfeiler */}
        {[196, 258].map((x) => (
          <polygon key={`buttress-${x}`} points={`${x},175 ${x},155 ${x + (x < 220 ? -6 : 6)},175`} fill={fillLight} />
        ))}
      </g>

      {/* ═══ ALTSTADT-HAEUSER (links vom Muenster) ═══ */}
      {[
        { x: 265, w: 18, h: 28, dh: 10, floors: 3 },
        { x: 286, w: 15, h: 24, dh: 8, floors: 2 },
        { x: 304, w: 20, h: 32, dh: 12, floors: 3 },
        { x: 327, w: 14, h: 22, dh: 7, floors: 2 },
      ].map((house) => (
        <g key={`lh-${house.x}`}>
          {/* Hauswand */}
          <rect x={house.x} y={175 - house.h} width={house.w} height={house.h} fill={fillDark} />
          {/* Giebeldach */}
          <polygon
            points={`${house.x - 2},${175 - house.h} ${house.x + house.w / 2},${175 - house.h - house.dh} ${house.x + house.w + 2},${175 - house.h}`}
            fill={fill}
          />
          {/* Fenster pro Stockwerk */}
          {Array.from({ length: house.floors }).map((_, fi) => {
            const fy = 175 - house.h + 5 + fi * 8;
            return (
              <g key={`wf-${house.x}-${fi}`}>
                <rect x={house.x + 3} y={fy} width={3} height={4} rx={0.5} fill={windowGlow} />
                <rect x={house.x + house.w - 6} y={fy} width={3} height={4} rx={0.5} fill={windowGlow} />
              </g>
            );
          })}
          {/* Tuer (Erdgeschoss) */}
          <rect x={house.x + house.w / 2 - 2} y={170} width={4} height={5} rx={1} fill={fillDark} />
        </g>
      ))}

      {/* ═══ HOLZBRUECKE (204m, laengste gedeckte Holzbruecke Europas) ═══ */}
      <g>
        {/* 6 Steinpfeiler im Wasser */}
        {[360, 400, 440, 480, 520].map((x) => (
          <g key={`pier-${x}`}>
            {/* Pfeiler (massiv, leicht verjuengt) */}
            <polygon points={`${x - 5},168 ${x - 4},192 ${x + 4},192 ${x + 5},168`} fill={fillDark} />
            {/* Eisbrechernase */}
            <polygon points={`${x},165 ${x - 5},168 ${x + 5},168`} fill={fill} />
          </g>
        ))}

        {/* Steinboegen zwischen Pfeilern */}
        {[360, 400, 440, 480].map((x) => (
          <path
            key={`arch-${x}`}
            d={`M${x + 4},185 Q${x + 22},172 ${x + 36},185`}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
          />
        ))}

        {/* Brueckenboden (Holzplanken) */}
        <rect x="348" y="164" width="185" height="5" fill={fillDark} />
        {/* Planken-Linien */}
        {[352, 360, 368, 376, 384, 392, 400, 408, 416, 424, 432, 440, 448, 456, 464, 472, 480, 488, 496, 504, 512, 520, 528].map((x) => (
          <line key={`plank-${x}`} x1={x} y1={164} x2={x} y2={169} stroke={strokeLight} strokeWidth="0.5" />
        ))}

        {/* Gedecktes Dach (Satteldach) */}
        <path
          d="M345,164 L345,150 Q395,143 440,150 Q485,143 535,150 L535,164"
          fill={fill}
        />
        {/* Dach-First */}
        <path
          d="M345,150 Q395,143 440,150 Q485,143 535,150"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
        />
        {/* Dachschindel-Linien */}
        {[153, 156, 159, 162].map((y) => (
          <path
            key={`shingle-${y}`}
            d={`M${347 + (y - 150) * 0.5},${y} Q${440},${y - 2} ${533 - (y - 150) * 0.5},${y}`}
            fill="none"
            stroke={strokeLight}
            strokeWidth="0.4"
          />
        ))}

        {/* Fachwerk-Waende (vertikale Pfosten + Andreaskreuze) */}
        {[352, 362, 372, 382, 392, 402, 412, 422, 432, 442, 452, 462, 472, 482, 492, 502, 512, 522, 530].map((x) => (
          <line key={`post-${x}`} x1={x} y1={150} x2={x} y2={164} stroke={strokeLight} strokeWidth="0.8" />
        ))}
        {/* Andreaskreuze (X-Streben, typisch Fachwerk) */}
        {[355, 375, 395, 415, 435, 455, 475, 495, 515].map((x) => (
          <g key={`cross-${x}`}>
            <line x1={x} y1={152} x2={x + 8} y2={162} stroke={strokeLight} strokeWidth="0.5" />
            <line x1={x + 8} y1={152} x2={x} y2={162} stroke={strokeLight} strokeWidth="0.5" />
          </g>
        ))}

        {/* Kapelle auf der Bruecke (kleine Erhoehung in der Mitte) */}
        <rect x="430" y="146" width="14" height="18" fill={fillDark} />
        <polygon points="428,146 437,138 446,146" fill={fill} />
        {/* Kapellen-Kreuz */}
        <line x1="437" y1="138" x2="437" y2="133" stroke={stroke} strokeWidth="1" />
        <line x1="434" y1="136" x2="440" y2="136" stroke={stroke} strokeWidth="1" />
        {/* Kapellenfenster */}
        <rect x="434" y="152" width="3" height="5" rx="1" fill={windowGlowBright} />
        <rect x="439" y="152" width="3" height="5" rx="1" fill={windowGlowBright} />
      </g>

      {/* ═══ SCHLOSS SCHOENAU (rechts) ═══ */}
      <g>
        {/* Hauptgebaeude */}
        <rect x="555" y="135" width="50" height="40" fill={fillDark} />
        {/* Walmdach */}
        <polygon points="552,135 580,118 608,135" fill={fill} />
        <polygon points="552,135 555,125 555,135" fill={fillLight} />
        <polygon points="608,135 605,125 605,135" fill={fillLight} />
        {/* Dachziegel */}
        {[121, 124, 127, 130, 133].map((y) => (
          <line key={`sr-${y}`} x1={555 + (y - 118) * 1.5} y1={y} x2={605 - (y - 118) * 1.5} y2={y} stroke={strokeLight} strokeWidth="0.4" />
        ))}

        {/* Schlossturm (Ecke) */}
        <rect x="600" y="110" width="12" height="65" fill={fillDark} />
        <ellipse cx="606" cy="110" rx="8" ry="4" fill={fill} />
        <polygon points="606,98 600,110 612,110" fill={fill} />
        {/* Turm-Fahne */}
        <line x1="606" y1="98" x2="606" y2="90" stroke={stroke} strokeWidth="1" />
        <polygon points="606,90 614,93 606,96" fill={isDark ? "rgba(255,100,100,0.3)" : "rgba(200,50,50,0.15)"} />

        {/* Schloss-Fenster (regelmaessig, Renaissance) */}
        {[0, 1, 2, 3].map((col) =>
          [0, 1, 2].map((row) => (
            <rect
              key={`sf-${col}-${row}`}
              x={560 + col * 10}
              y={140 + row * 10}
              width={5}
              height={6}
              rx={0.5}
              fill={windowGlow}
            />
          )),
        )}

        {/* Schloss-Portal */}
        <rect x="574" y="165" width="12" height="10" fill={fillDark} />
        <path d="M574,165 Q580,158 586,165" fill={fillDark} />

        {/* Schlossgarten-Mauer */}
        <rect x="545" y="170" width="65" height="5" fill={fillLight} />
        <rect x="545" y="168" width="3" height="7" fill={fill} />
        <rect x="607" y="168" width="3" height="7" fill={fill} />
      </g>

      {/* ═══ RECHTE ALTSTADT + Hotzenwald-Hang ═══ */}
      {[
        { x: 620, w: 16, h: 25, dh: 9, floors: 2 },
        { x: 640, w: 20, h: 30, dh: 11, floors: 3 },
        { x: 664, w: 14, h: 22, dh: 8, floors: 2 },
        { x: 682, w: 18, h: 26, dh: 9, floors: 2 },
      ].map((house) => (
        <g key={`rh-${house.x}`}>
          <rect x={house.x} y={175 - house.h} width={house.w} height={house.h} fill={fillDark} />
          <polygon
            points={`${house.x - 1},${175 - house.h} ${house.x + house.w / 2},${175 - house.h - house.dh} ${house.x + house.w + 1},${175 - house.h}`}
            fill={fill}
          />
          {Array.from({ length: house.floors }).map((_, fi) => {
            const fy = 175 - house.h + 5 + fi * 8;
            return (
              <g key={`rwf-${house.x}-${fi}`}>
                <rect x={house.x + 3} y={fy} width={3} height={4} rx={0.5} fill={windowGlow} />
                <rect x={house.x + house.w - 6} y={fy} width={3} height={4} rx={0.5} fill={windowGlow} />
              </g>
            );
          })}
        </g>
      ))}

      {/* Hotzenwald-Hang rechts */}
      <path d="M700,170 Q720,155 745,162 Q765,148 790,158 Q800,152 800,165 L800,240 L700,240 Z" fill={fill} />
      {[710, 725, 740, 758, 775, 790].map((x) => (
        <g key={`ht-${x}`}>
          <polygon points={`${x},${154 + (x % 5) * 2} ${x - 4},${166 + (x % 3)} ${x + 4},${166 + (x % 3)}`} fill={fill} />
          <polygon points={`${x},${158 + (x % 5) * 2} ${x - 3},${166 + (x % 3)} ${x + 3},${166 + (x % 3)}`} fill={fillDark} />
        </g>
      ))}

      {/* ═══ RHEIN (mehrschichtig mit Spiegelung) ═══ */}
      {/* Uferboeschung */}
      <path d="M0,175 L195,175 L195,178 L0,178 Z" fill={fillLight} />
      <path d="M545,175 L800,175 L800,178 L545,178 Z" fill={fillLight} />

      {/* Hauptwasserlinie */}
      <path
        d="M0,180 Q20,177 40,180 Q60,183 80,180 Q100,177 120,180 Q140,183 160,180 Q180,177 200,180 Q220,183 240,180 Q260,177 280,180 Q300,183 320,180 Q340,177 360,180 Q380,183 400,180 Q420,177 440,180 Q460,183 480,180 Q500,177 520,180 Q540,183 560,180 Q580,177 600,180 Q620,183 640,180 Q660,177 680,180 Q700,183 720,180 Q740,177 760,180 Q780,183 800,180 L800,240 L0,240 Z"
        fill={water}
      />
      {/* Spiegelung (invertierte Silhouette, sehr schwach) */}
      <path
        d="M0,190 Q40,188 80,190 Q120,192 160,190 Q200,188 240,190 Q280,192 320,190 Q360,188 400,190 Q440,192 480,190 Q520,188 560,190 Q600,192 640,190 Q680,188 720,190 Q760,192 800,190 L800,200 L0,200 Z"
        fill={waterDeep}
        style={{ animation: "waveShift 8s ease-in-out infinite" }}
      />
      {/* Dritte Wellenebene */}
      <path
        d="M0,198 Q30,196 60,198 Q90,200 120,198 Q150,196 180,198 Q210,200 240,198 Q270,196 300,198 Q330,200 360,198 Q390,196 420,198 Q450,200 480,198 Q510,196 540,198 Q570,200 600,198 Q630,196 660,198 Q690,200 720,198 Q750,196 780,198 L800,198 L800,240 L0,240 Z"
        fill={waterDeep}
        style={{ animation: "waveShift 6s ease-in-out infinite reverse" }}
      />

      {/* Bruecken-Spiegelung im Wasser */}
      <rect x="348" y="182" width="185" height="3" fill={waterDeep} opacity={0.5} />
    </svg>
  );
}

// ── Animierte Wetter-Icons (gross) ──
function AnimatedWeatherIcon({ type, size = 72 }: { type: string; size?: number }) {
  const s = size;
  const half = s / 2;

  switch (type) {
    case "sun":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Aeusserer Glow */}
          <div
            className="absolute rounded-full"
            style={{
              inset: -8,
              background: "radial-gradient(circle, rgba(253,224,71,0.3) 0%, transparent 70%)",
              animation: "pulse 3s ease-in-out infinite",
            }}
          />
          {/* Strahlen */}
          <div
            className="absolute inset-0"
            style={{ animation: "spin 30s linear infinite" }}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  width: 2,
                  height: s * 0.28,
                  background: "linear-gradient(180deg, rgba(253,224,71,0.8) 0%, transparent 100%)",
                  transformOrigin: "center bottom",
                  transform: `translate(-50%, -100%) rotate(${i * 30}deg) translateY(-${s * 0.12}px)`,
                }}
              />
            ))}
          </div>
          {/* Sonnenkern */}
          <div
            className="absolute rounded-full"
            style={{
              inset: s * 0.2,
              background: "radial-gradient(circle at 35% 35%, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
              boxShadow: "0 0 24px rgba(251,191,36,0.6), inset 0 -3px 6px rgba(245,158,11,0.3)",
            }}
          />
        </div>
      );

    case "cloud":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          <div style={{ animation: "float 5s ease-in-out infinite" }}>
            {/* Haupt-Wolke */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.2,
                left: s * 0.05,
                width: s * 0.85,
                height: s * 0.35,
                background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(220,220,230,0.8) 100%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            />
            {/* Obere Wolken-Beulen */}
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.38,
                left: s * 0.12,
                width: s * 0.45,
                height: s * 0.45,
                background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,240,0.85) 100%)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.33,
                left: s * 0.4,
                width: s * 0.38,
                height: s * 0.38,
                background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(220,225,235,0.75) 100%)",
              }}
            />
          </div>
        </div>
      );

    case "cloud-sun":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Sonne dahinter */}
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.02,
              right: s * 0.02,
              width: s * 0.45,
              height: s * 0.45,
              background: "radial-gradient(circle at 40% 40%, #FEF08A, #FBBF24, #F59E0B)",
              boxShadow: "0 0 16px rgba(251,191,36,0.5)",
            }}
          />
          {/* Wolke davor */}
          <div style={{ animation: "float 5s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.12,
                left: 0,
                width: s * 0.75,
                height: s * 0.3,
                background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(220,225,235,0.8))",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.3,
                left: s * 0.08,
                width: s * 0.38,
                height: s * 0.38,
                background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(230,230,240,0.85))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                bottom: s * 0.26,
                left: s * 0.3,
                width: s * 0.3,
                height: s * 0.3,
                background: "rgba(255,255,255,0.8)",
              }}
            />
          </div>
        </div>
      );

    case "rain":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Dunkle Wolke */}
          <div style={{ animation: "float 4s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.08,
                left: s * 0.05,
                width: s * 0.85,
                height: s * 0.32,
                background: "linear-gradient(180deg, rgba(180,190,200,0.85), rgba(140,155,170,0.75))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 0,
                left: s * 0.15,
                width: s * 0.42,
                height: s * 0.38,
                background: "linear-gradient(180deg, rgba(190,200,210,0.9), rgba(160,175,190,0.8))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.03,
                left: s * 0.4,
                width: s * 0.35,
                height: s * 0.32,
                background: "rgba(175,188,200,0.8)",
              }}
            />
          </div>
          {/* Regentropfen */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: s * 0.15 + i * (s * 0.15),
                top: s * 0.5,
                width: 2.5,
                height: s * 0.18,
                background: "linear-gradient(180deg, rgba(147,197,253,0.9), rgba(96,165,250,0.4))",
                borderRadius: "50% 50% 50% 50% / 20% 20% 80% 80%",
                animation: `rainDrop 0.8s ease-in infinite ${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      );

    case "snow":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Wolke */}
          <div style={{ animation: "float 5s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.05,
                left: s * 0.05,
                width: s * 0.85,
                height: s * 0.32,
                background: "linear-gradient(180deg, rgba(200,210,220,0.85), rgba(175,185,200,0.75))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 0,
                left: s * 0.18,
                width: s * 0.4,
                height: s * 0.35,
                background: "rgba(210,218,230,0.9)",
              }}
            />
          </div>
          {/* Schneeflocken */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: s * 0.1 + i * (s * 0.14),
                top: s * 0.5,
                width: s * 0.06,
                height: s * 0.06,
                background: "radial-gradient(circle, rgba(255,255,255,1) 40%, rgba(255,255,255,0.4) 100%)",
                boxShadow: "0 0 4px rgba(255,255,255,0.8)",
                animation: `snowFall 2.5s ease-in-out infinite ${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      );

    case "moon":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Mond-Glow */}
          <div
            className="absolute rounded-full"
            style={{
              inset: -6,
              background: "radial-gradient(circle, rgba(253,224,71,0.15) 0%, transparent 70%)",
            }}
          />
          {/* Mond */}
          <div
            className="absolute rounded-full"
            style={{
              inset: s * 0.15,
              background: "radial-gradient(circle at 35% 35%, #FEF9C3 0%, #FDE68A 50%, #FCD34D 100%)",
              boxShadow: "0 0 20px rgba(253,224,71,0.3)",
            }}
          />
          {/* Mond-Schatten (Sichel-Effekt) */}
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.12,
              right: s * 0.08,
              width: s * 0.5,
              height: s * 0.5,
              background: "inherit",
              // Inherit-Hack: wir ueberlagern mit dem Hintergrund
              opacity: 0,
            }}
          />
          {/* Krater */}
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.3,
              left: s * 0.32,
              width: s * 0.1,
              height: s * 0.1,
              background: "rgba(200,180,100,0.25)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: s * 0.48,
              left: s * 0.45,
              width: s * 0.07,
              height: s * 0.07,
              background: "rgba(200,180,100,0.2)",
            }}
          />
          {/* Sterne */}
          {[
            { x: -4, y: 4, s: 2.5 },
            { x: s - 8, y: 0, s: 2 },
            { x: -8, y: s * 0.6, s: 1.5 },
            { x: s - 4, y: s * 0.7, s: 2 },
            { x: s * 0.3, y: -6, s: 1.8 },
          ].map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: star.x,
                top: star.y,
                width: star.s,
                height: star.s,
                background: "#fff",
                boxShadow: `0 0 ${star.s * 2}px rgba(255,255,255,0.8)`,
                animation: `twinkle 2.5s ease-in-out infinite ${i * 0.6}s`,
              }}
            />
          ))}
        </div>
      );

    case "sunset":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Glow am Horizont */}
          <div
            className="absolute"
            style={{
              bottom: 0,
              left: -s * 0.1,
              right: -s * 0.1,
              height: s * 0.5,
              background: "radial-gradient(ellipse at 50% 100%, rgba(251,146,60,0.4) 0%, transparent 70%)",
            }}
          />
          {/* Sonne (halb) */}
          <div
            className="absolute overflow-hidden"
            style={{
              bottom: s * 0.15,
              left: "50%",
              transform: "translateX(-50%)",
              width: s * 0.55,
              height: s * 0.28,
              borderRadius: `${s * 0.28}px ${s * 0.28}px 0 0`,
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: s * 0.55,
                height: s * 0.55,
                background: "radial-gradient(circle at 50% 50%, #FEF08A 0%, #FB923C 50%, #EF4444 100%)",
                boxShadow: "0 0 30px rgba(251,146,60,0.6)",
              }}
            />
          </div>
          {/* Horizont-Streifen */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute"
              style={{
                bottom: s * 0.12 - i * 5,
                left: s * 0.1,
                right: s * 0.1,
                height: 1,
                background: `rgba(255,255,255,${0.3 - i * 0.08})`,
              }}
            />
          ))}
        </div>
      );

    case "storm":
      return (
        <div className="relative" style={{ width: s, height: s }}>
          {/* Dunkle Sturm-Wolke */}
          <div style={{ animation: "float 3s ease-in-out infinite" }}>
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.05,
                left: s * 0.02,
                width: s * 0.9,
                height: s * 0.35,
                background: "linear-gradient(180deg, rgba(120,130,140,0.8), rgba(80,90,100,0.7))",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: 0,
                left: s * 0.1,
                width: s * 0.5,
                height: s * 0.4,
                background: "rgba(130,140,150,0.85)",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                top: s * 0.02,
                left: s * 0.38,
                width: s * 0.4,
                height: s * 0.35,
                background: "rgba(110,120,135,0.8)",
              }}
            />
          </div>
          {/* Blitz */}
          <svg
            className="absolute"
            style={{
              bottom: s * 0.05,
              left: "50%",
              transform: "translateX(-50%)",
              width: s * 0.35,
              height: s * 0.5,
              animation: "flash 4s ease-in-out infinite",
              filter: "drop-shadow(0 0 6px rgba(251,191,36,0.8))",
            }}
            viewBox="0 0 24 36"
          >
            <polygon
              points="14,0 6,15 11,15 4,36 22,12 15,12 20,0"
              fill="#FBBF24"
            />
          </svg>
          {/* Regen */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: s * 0.18 + i * (s * 0.22),
                top: s * 0.48,
                width: 2,
                height: s * 0.14,
                background: "linear-gradient(180deg, rgba(147,197,253,0.7), rgba(96,165,250,0.3))",
                borderRadius: 4,
                animation: `rainDrop 0.7s ease-in infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      );

    default:
      return <div style={{ width: s, height: s, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />;
  }
}

// ── Kleines Icon fuer Forecast/Hourly ──
function SmallIcon({ type, size = 24 }: { type: string; size?: number }) {
  return <AnimatedWeatherIcon type={type} size={size} />;
}

export default function WeatherDemoPage() {
  const [current, setCurrent] = useState<WeatherKey>("sunny-day");
  const preset = WEATHER_PRESETS[current];
  const isDark = current === "clear-night" || current === "storm";

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      {/* Auswahl */}
      <div className="max-w-md mx-auto mb-4">
        <h1 className="text-lg font-bold text-anthrazit mb-3">
          Wetter-Widget Demo — iPhone Style
        </h1>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(WEATHER_PRESETS) as WeatherKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setCurrent(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                current === key
                  ? "bg-anthrazit text-white shadow-md scale-105"
                  : "bg-white text-anthrazit border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {WEATHER_PRESETS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* === WIDGET 5:2 FORMAT === */}
      <div className="max-w-lg mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl shadow-2xl"
          style={{
            background: preset.gradient,
            transition: "background 0.8s ease",
            aspectRatio: "5 / 2",
          }}
        >
          {/* Silhouette */}
          <SkylineSilhouette isDark={isDark || current === "rain"} textColor={preset.textColor} />

          {/* Inhalt — horizontales Layout */}
          <div className="relative z-10 h-full flex items-stretch p-5 gap-4">
            {/* Links: Temperatur + Beschreibung */}
            <div className="flex flex-col justify-between flex-shrink-0">
              <div>
                <p
                  className="text-xs font-medium tracking-wide"
                  style={{ color: preset.subColor }}
                >
                  Bad Säckingen
                </p>
                <span
                  className="font-extralight tracking-tighter leading-none block"
                  style={{ color: preset.textColor, fontSize: 56 }}
                >
                  {preset.temp}°
                </span>
              </div>
              <div>
                <p
                  className="text-sm"
                  style={{ color: preset.subColor }}
                >
                  {preset.desc}
                </p>
                <div
                  className="flex gap-3 mt-0.5 text-[10px] font-medium"
                  style={{ color: preset.subColor }}
                >
                  <span>Gefühlt {preset.feelsLike}°</span>
                  <span>💧 {preset.humidity}%</span>
                  <span>🌬 {preset.wind} km/h</span>
                </div>
              </div>
            </div>

            {/* Mitte: Icon */}
            <div className="flex items-center justify-center flex-shrink-0">
              <AnimatedWeatherIcon type={preset.icon} size={64} />
            </div>

            {/* Rechts: 3-Tage Forecast kompakt */}
            <div
              className="flex flex-col justify-center gap-1.5 ml-auto"
              style={{ borderLeft: `1px solid ${preset.subColor.replace(/[\d.]+\)$/, "0.2)")}`, paddingLeft: 16 }}
            >
              {preset.forecast.map((day) => (
                <div key={day.day} className="flex items-center gap-2">
                  <span
                    className="w-6 text-[10px] font-medium"
                    style={{ color: preset.subColor }}
                  >
                    {day.day}
                  </span>
                  <SmallIcon type={day.icon} size={18} />
                  <span
                    className="text-xs font-semibold w-8 text-right"
                    style={{ color: preset.textColor }}
                  >
                    {day.high}°
                  </span>
                  <span
                    className="text-[10px] w-6 text-right"
                    style={{ color: preset.subColor }}
                  >
                    {day.low}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-anthrazit mb-2">
            Was du siehst:
          </h2>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>
              <strong>7 Wetter-Varianten</strong> — Sonnig, Bewölkt, Regen,
              Schnee, Nacht, Abendrot, Gewitter
            </li>
            <li>
              <strong>Gradient-Hintergrund:</strong> Realistisch wie Apple
              Weather (inline CSS, kein Bild)
            </li>
            <li>
              <strong>SVG-Silhouette:</strong> Holzbrücke + Münster St. Fridolin
              + Schwarzwald-Berge + Rhein-Wellen
            </li>
            <li>
              <strong>Animierte Icons:</strong> Rotierende Sonne, schwebende
              Wolken, fallender Regen/Schnee, funkelnde Sterne, Blitz
            </li>
            <li>
              <strong>Stunden-Verlauf:</strong> Horizontaler Scroll mit
              Temperatur pro Stunde
            </li>
            <li>
              <strong>3-Tage Forecast:</strong> Mit Temperatur-Balken (farbig,
              wie iPhone)
            </li>
            <li>
              <strong>Zero Dependencies:</strong> Kein Bild, kein externer
              Service — nur CSS + SVG + React
            </li>
          </ul>
        </div>
      </div>

      {/* Globale Animationen */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        @keyframes rainDrop {
          0% { opacity: 0.8; transform: translateY(-6px); }
          100% { opacity: 0; transform: translateY(14px); }
        }

        @keyframes snowFall {
          0% { opacity: 0.9; transform: translateY(-6px) translateX(0); }
          33% { transform: translateY(4px) translateX(4px); }
          66% { transform: translateY(10px) translateX(-2px); }
          100% { opacity: 0; transform: translateY(16px) translateX(1px); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.6); }
        }

        @keyframes flash {
          0%, 85%, 100% { opacity: 0; }
          87%, 93% { opacity: 1; }
          89% { opacity: 0.2; }
          91% { opacity: 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes waveShift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-8px); }
        }
      `}</style>
    </div>
  );
}
