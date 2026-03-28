// Bad Saeckingen SVG-Silhouette
// Muenster St. Fridolin, Holzbruecke, Schloss Schoenau, Altstadt, Tannen, Rhein

interface SkylineSilhouetteProps {
  opacity?: number;
}

export function SkylineSilhouette({ opacity = 0.1 }: SkylineSilhouetteProps) {
  // Opacity-basierte Farben (vereinfacht gegenueber isDark/textColor)
  const fill = `rgba(0,0,0,${(opacity * 1).toFixed(2)})`;
  const fillLight = `rgba(0,0,0,${(opacity * 0.6).toFixed(2)})`;
  const fillDark = `rgba(0,0,0,${(opacity * 1.4).toFixed(2)})`;
  const stroke = `rgba(0,0,0,${(opacity * 1).toFixed(2)})`;
  const strokeLight = `rgba(0,0,0,${(opacity * 0.6).toFixed(2)})`;
  const water = `rgba(0,0,0,${(opacity * 0.5).toFixed(2)})`;
  const waterDeep = `rgba(0,0,0,${(opacity * 0.3).toFixed(2)})`;
  const windowGlow = `rgba(255,200,60,${(opacity * 0.8).toFixed(2)})`;
  const windowGlowBright = `rgba(255,210,80,${(opacity * 0.3).toFixed(2)})`;

  return (
    <svg
      viewBox="0 0 800 240"
      className="absolute bottom-0 left-0 w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Ferne Bergkette */}
      <path
        d="M0,155 Q30,120 70,140 Q110,105 150,125 Q190,90 240,115 Q280,80 330,108 Q370,75 420,100 Q460,70 510,95 Q550,78 590,98 Q630,82 670,105 Q710,88 750,110 Q780,95 800,120 L800,240 L0,240 Z"
        fill={`rgba(0,0,0,${(opacity * 0.3).toFixed(2)})`}
      />
      {/* Nahe Bergkette */}
      <path
        d="M0,168 Q50,140 100,155 Q140,130 190,148 Q230,125 280,145 Q320,130 360,150 Q400,135 440,152 Q480,138 520,150 Q560,135 610,148 Q650,132 700,150 Q740,138 780,155 Q800,148 800,160 L800,240 L0,240 Z"
        fill={fillLight}
      />

      {/* LINKS: Bergsee-Gebiet + Tannenwald */}
      <path
        d="M0,178 Q20,165 50,172 Q80,158 110,168 Q130,155 155,164 Q175,155 195,162 L195,240 L0,240 Z"
        fill={fill}
      />
      {/* Tannen (mehrstufig fuer Tiefe) */}
      {[
        { x: 15, y: 170, h: 16 },
        { x: 30, y: 165, h: 18 },
        { x: 48, y: 168, h: 15 },
        { x: 65, y: 160, h: 20 },
        { x: 80, y: 164, h: 17 },
        { x: 95, y: 158, h: 22 },
        { x: 112, y: 162, h: 18 },
        { x: 128, y: 156, h: 20 },
        { x: 145, y: 160, h: 17 },
        { x: 162, y: 158, h: 19 },
        { x: 178, y: 162, h: 16 },
      ].map((t) => (
        <g key={`tree-${t.x}`}>
          <rect x={t.x - 1} y={t.y} width={2} height={5} fill={fillDark} />
          <polygon
            points={`${t.x},${t.y - t.h} ${t.x - 5},${t.y - 2} ${t.x + 5},${t.y - 2}`}
            fill={fill}
          />
          <polygon
            points={`${t.x},${t.y - t.h + 4} ${t.x - 4},${t.y - 5} ${t.x + 4},${t.y - 5}`}
            fill={fillDark}
          />
          <polygon
            points={`${t.x},${t.y - t.h + 8} ${t.x - 3},${t.y - 8} ${t.x + 3},${t.y - 8}`}
            fill={fill}
          />
        </g>
      ))}

      {/* MUENSTER ST. FRIDOLIN */}
      <g>
        <rect x="195" y="143" width="12" height="32" fill={fill} />
        <rect x="247" y="143" width="12" height="32" fill={fill} />
        <rect x="200" y="138" width="55" height="37" fill={fillDark} />
        <polygon points="198,138 227,122 258,138" fill={fill} />
        {[126, 129, 132, 135].map((y) => (
          <line
            key={`roof-${y}`}
            x1={200 + (y - 122) * 1.8}
            y1={y}
            x2={256 - (y - 122) * 1.8}
            y2={y}
            stroke={strokeLight}
            strokeWidth="0.5"
          />
        ))}

        {/* Hauptturm (barock, mit Zwiebeldach) */}
        <rect x="218" y="80" width="18" height="60" fill={fillDark} />
        <rect x="216" y="95" width="22" height="2" fill={fill} />
        <rect x="216" y="110" width="22" height="2" fill={fill} />
        <ellipse cx="227" cy="80" rx="12" ry="7" fill={fillDark} />
        <ellipse cx="227" cy="78" rx="9" ry="5" fill={fill} />
        <rect x="224" y="68" width="6" height="10" fill={fill} />
        <ellipse cx="227" cy="68" rx="5" ry="3" fill={fillDark} />
        <polygon points="227,50 223,68 231,68" fill={fill} />
        <circle cx="227" cy="50" r="2" fill={fillDark} />
        <line
          x1="227"
          y1="48"
          x2="227"
          y2="40"
          stroke={stroke}
          strokeWidth="1.5"
        />
        <line
          x1="223"
          y1="44"
          x2="231"
          y2="44"
          stroke={stroke}
          strokeWidth="1.5"
        />

        {/* Turm-Fenster (Schallarkaden) */}
        {[84, 88, 92].map((y) => (
          <g key={`tf-${y}`}>
            <rect
              x="221"
              y={y}
              width="3"
              height="5"
              rx="1.5"
              fill={windowGlow}
            />
            <rect
              x="226"
              y={y}
              width="3"
              height="5"
              rx="1.5"
              fill={windowGlow}
            />
            <rect
              x="231"
              y={y}
              width="3"
              height="5"
              rx="1.5"
              fill={windowGlow}
            />
          </g>
        ))}
        {/* Turmuhren */}
        <circle
          cx="227"
          cy="103"
          r="4"
          fill="none"
          stroke={stroke}
          strokeWidth="1"
        />
        <line
          x1="227"
          y1="103"
          x2="227"
          y2="100"
          stroke={stroke}
          strokeWidth="1"
        />
        <line
          x1="227"
          y1="103"
          x2="229"
          y2="104"
          stroke={stroke}
          strokeWidth="0.8"
        />

        {/* Rosettenfenster */}
        <circle
          cx="227"
          cy="148"
          r="6"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
        />
        <circle
          cx="227"
          cy="148"
          r="3"
          fill="none"
          stroke={strokeLight}
          strokeWidth="0.8"
        />
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
            <path
              d={`M${fx},150 Q${fx + 2},146 ${fx + 4},150`}
              fill={windowGlow}
            />
          </g>
        ))}

        {/* Portal */}
        <rect x="222" y="163" width="10" height="12" fill={fillDark} />
        <path d="M222,163 Q227,157 232,163" fill={fillDark} />

        {/* Strebepfeiler */}
        {[196, 258].map((x) => (
          <polygon
            key={`buttress-${x}`}
            points={`${x},175 ${x},155 ${x + (x < 220 ? -6 : 6)},175`}
            fill={fillLight}
          />
        ))}
      </g>

      {/* ALTSTADT-HAEUSER (links vom Muenster) */}
      {[
        { x: 265, w: 18, h: 28, dh: 10, floors: 3 },
        { x: 286, w: 15, h: 24, dh: 8, floors: 2 },
        { x: 304, w: 20, h: 32, dh: 12, floors: 3 },
        { x: 327, w: 14, h: 22, dh: 7, floors: 2 },
      ].map((house) => (
        <g key={`lh-${house.x}`}>
          <rect
            x={house.x}
            y={175 - house.h}
            width={house.w}
            height={house.h}
            fill={fillDark}
          />
          <polygon
            points={`${house.x - 2},${175 - house.h} ${house.x + house.w / 2},${175 - house.h - house.dh} ${house.x + house.w + 2},${175 - house.h}`}
            fill={fill}
          />
          {Array.from({ length: house.floors }).map((_, fi) => {
            const fy = 175 - house.h + 5 + fi * 8;
            return (
              <g key={`wf-${house.x}-${fi}`}>
                <rect
                  x={house.x + 3}
                  y={fy}
                  width={3}
                  height={4}
                  rx={0.5}
                  fill={windowGlow}
                />
                <rect
                  x={house.x + house.w - 6}
                  y={fy}
                  width={3}
                  height={4}
                  rx={0.5}
                  fill={windowGlow}
                />
              </g>
            );
          })}
          <rect
            x={house.x + house.w / 2 - 2}
            y={170}
            width={4}
            height={5}
            rx={1}
            fill={fillDark}
          />
        </g>
      ))}

      {/* HOLZBRUECKE (204m, laengste gedeckte Holzbruecke Europas) */}
      <g>
        {[360, 400, 440, 480, 520].map((x) => (
          <g key={`pier-${x}`}>
            <polygon
              points={`${x - 5},168 ${x - 4},192 ${x + 4},192 ${x + 5},168`}
              fill={fillDark}
            />
            <polygon
              points={`${x},165 ${x - 5},168 ${x + 5},168`}
              fill={fill}
            />
          </g>
        ))}

        {[360, 400, 440, 480].map((x) => (
          <path
            key={`arch-${x}`}
            d={`M${x + 4},185 Q${x + 22},172 ${x + 36},185`}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
          />
        ))}

        <rect x="348" y="164" width="185" height="5" fill={fillDark} />
        {[
          352, 360, 368, 376, 384, 392, 400, 408, 416, 424, 432, 440, 448, 456,
          464, 472, 480, 488, 496, 504, 512, 520, 528,
        ].map((x) => (
          <line
            key={`plank-${x}`}
            x1={x}
            y1={164}
            x2={x}
            y2={169}
            stroke={strokeLight}
            strokeWidth="0.5"
          />
        ))}

        <path
          d="M345,164 L345,150 Q395,143 440,150 Q485,143 535,150 L535,164"
          fill={fill}
        />
        <path
          d="M345,150 Q395,143 440,150 Q485,143 535,150"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
        />
        {[153, 156, 159, 162].map((y) => (
          <path
            key={`shingle-${y}`}
            d={`M${347 + (y - 150) * 0.5},${y} Q${440},${y - 2} ${533 - (y - 150) * 0.5},${y}`}
            fill="none"
            stroke={strokeLight}
            strokeWidth="0.4"
          />
        ))}

        {[
          352, 362, 372, 382, 392, 402, 412, 422, 432, 442, 452, 462, 472, 482,
          492, 502, 512, 522, 530,
        ].map((x) => (
          <line
            key={`post-${x}`}
            x1={x}
            y1={150}
            x2={x}
            y2={164}
            stroke={strokeLight}
            strokeWidth="0.8"
          />
        ))}
        {[355, 375, 395, 415, 435, 455, 475, 495, 515].map((x) => (
          <g key={`cross-${x}`}>
            <line
              x1={x}
              y1={152}
              x2={x + 8}
              y2={162}
              stroke={strokeLight}
              strokeWidth="0.5"
            />
            <line
              x1={x + 8}
              y1={152}
              x2={x}
              y2={162}
              stroke={strokeLight}
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* Kapelle auf der Bruecke */}
        <rect x="430" y="146" width="14" height="18" fill={fillDark} />
        <polygon points="428,146 437,138 446,146" fill={fill} />
        <line
          x1="437"
          y1="138"
          x2="437"
          y2="133"
          stroke={stroke}
          strokeWidth="1"
        />
        <line
          x1="434"
          y1="136"
          x2="440"
          y2="136"
          stroke={stroke}
          strokeWidth="1"
        />
        <rect
          x="434"
          y="152"
          width="3"
          height="5"
          rx="1"
          fill={windowGlowBright}
        />
        <rect
          x="439"
          y="152"
          width="3"
          height="5"
          rx="1"
          fill={windowGlowBright}
        />
      </g>

      {/* SCHLOSS SCHOENAU */}
      <g>
        <rect x="555" y="135" width="50" height="40" fill={fillDark} />
        <polygon points="552,135 580,118 608,135" fill={fill} />
        <polygon points="552,135 555,125 555,135" fill={fillLight} />
        <polygon points="608,135 605,125 605,135" fill={fillLight} />
        {[121, 124, 127, 130, 133].map((y) => (
          <line
            key={`sr-${y}`}
            x1={555 + (y - 118) * 1.5}
            y1={y}
            x2={605 - (y - 118) * 1.5}
            y2={y}
            stroke={strokeLight}
            strokeWidth="0.4"
          />
        ))}

        <rect x="600" y="110" width="12" height="65" fill={fillDark} />
        <ellipse cx="606" cy="110" rx="8" ry="4" fill={fill} />
        <polygon points="606,98 600,110 612,110" fill={fill} />
        <line
          x1="606"
          y1="98"
          x2="606"
          y2="90"
          stroke={stroke}
          strokeWidth="1"
        />
        <polygon
          points="606,90 614,93 606,96"
          fill={`rgba(200,50,50,${(opacity * 1.5).toFixed(2)})`}
        />

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

        <rect x="574" y="165" width="12" height="10" fill={fillDark} />
        <path d="M574,165 Q580,158 586,165" fill={fillDark} />

        <rect x="545" y="170" width="65" height="5" fill={fillLight} />
        <rect x="545" y="168" width="3" height="7" fill={fill} />
        <rect x="607" y="168" width="3" height="7" fill={fill} />
      </g>

      {/* RECHTE ALTSTADT + Hotzenwald-Hang */}
      {[
        { x: 620, w: 16, h: 25, dh: 9, floors: 2 },
        { x: 640, w: 20, h: 30, dh: 11, floors: 3 },
        { x: 664, w: 14, h: 22, dh: 8, floors: 2 },
        { x: 682, w: 18, h: 26, dh: 9, floors: 2 },
      ].map((house) => (
        <g key={`rh-${house.x}`}>
          <rect
            x={house.x}
            y={175 - house.h}
            width={house.w}
            height={house.h}
            fill={fillDark}
          />
          <polygon
            points={`${house.x - 1},${175 - house.h} ${house.x + house.w / 2},${175 - house.h - house.dh} ${house.x + house.w + 1},${175 - house.h}`}
            fill={fill}
          />
          {Array.from({ length: house.floors }).map((_, fi) => {
            const fy = 175 - house.h + 5 + fi * 8;
            return (
              <g key={`rwf-${house.x}-${fi}`}>
                <rect
                  x={house.x + 3}
                  y={fy}
                  width={3}
                  height={4}
                  rx={0.5}
                  fill={windowGlow}
                />
                <rect
                  x={house.x + house.w - 6}
                  y={fy}
                  width={3}
                  height={4}
                  rx={0.5}
                  fill={windowGlow}
                />
              </g>
            );
          })}
        </g>
      ))}

      {/* Hotzenwald-Hang rechts */}
      <path
        d="M700,170 Q720,155 745,162 Q765,148 790,158 Q800,152 800,165 L800,240 L700,240 Z"
        fill={fill}
      />
      {[710, 725, 740, 758, 775, 790].map((x) => (
        <g key={`ht-${x}`}>
          <polygon
            points={`${x},${154 + (x % 5) * 2} ${x - 4},${166 + (x % 3)} ${x + 4},${166 + (x % 3)}`}
            fill={fill}
          />
          <polygon
            points={`${x},${158 + (x % 5) * 2} ${x - 3},${166 + (x % 3)} ${x + 3},${166 + (x % 3)}`}
            fill={fillDark}
          />
        </g>
      ))}

      {/* RHEIN (mehrschichtig mit Spiegelung) */}
      <path d="M0,175 L195,175 L195,178 L0,178 Z" fill={fillLight} />
      <path d="M545,175 L800,175 L800,178 L545,178 Z" fill={fillLight} />

      <path
        d="M0,180 Q20,177 40,180 Q60,183 80,180 Q100,177 120,180 Q140,183 160,180 Q180,177 200,180 Q220,183 240,180 Q260,177 280,180 Q300,183 320,180 Q340,177 360,180 Q380,183 400,180 Q420,177 440,180 Q460,183 480,180 Q500,177 520,180 Q540,183 560,180 Q580,177 600,180 Q620,183 640,180 Q660,177 680,180 Q700,183 720,180 Q740,177 760,180 Q780,183 800,180 L800,240 L0,240 Z"
        fill={water}
      />
      <path
        d="M0,190 Q40,188 80,190 Q120,192 160,190 Q200,188 240,190 Q280,192 320,190 Q360,188 400,190 Q440,192 480,190 Q520,188 560,190 Q600,192 640,190 Q680,188 720,190 Q760,192 800,190 L800,200 L0,200 Z"
        fill={waterDeep}
        style={{ animation: "waveShift 8s ease-in-out infinite" }}
      />
      <path
        d="M0,198 Q30,196 60,198 Q90,200 120,198 Q150,196 180,198 Q210,200 240,198 Q270,196 300,198 Q330,200 360,198 Q390,196 420,198 Q450,200 480,198 Q510,196 540,198 Q570,200 600,198 Q630,196 660,198 Q690,200 720,198 Q750,196 780,198 L800,198 L800,240 L0,240 Z"
        fill={waterDeep}
        style={{ animation: "waveShift 6s ease-in-out infinite reverse" }}
      />

      {/* Bruecken-Spiegelung im Wasser */}
      <rect
        x="348"
        y="182"
        width="185"
        height="3"
        fill={waterDeep}
        opacity={0.5}
      />
    </svg>
  );
}
