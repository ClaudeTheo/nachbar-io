// Handgezeichnete Quartier-Illustration mit jungen und alten Menschen
export function QuartierIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Illustration eines deutschen Quartiers mit Nachbarn"
    >
      {/* Himmel-Gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#f0fdf4" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>

      {/* Hintergrund */}
      <rect width="800" height="400" fill="url(#sky)" rx="16" />

      {/* Sanfte Hügel */}
      <ellipse cx="400" cy="420" rx="500" ry="120" fill="url(#grass)" opacity="0.5" />
      <ellipse cx="200" cy="400" rx="350" ry="100" fill="#86efac" opacity="0.4" />
      <ellipse cx="650" cy="410" rx="300" ry="90" fill="#86efac" opacity="0.3" />

      {/* Boden */}
      <rect y="320" width="800" height="80" fill="#86efac" opacity="0.6" rx="0" />
      <rect y="340" width="800" height="60" fill="#4ade80" opacity="0.3" />

      {/* Weg */}
      <path d="M300 400 Q400 320 500 400" fill="#fde68a" opacity="0.5" />
      <path d="M320 400 Q400 330 480 400" fill="#fde68a" opacity="0.3" />

      {/* Wolken */}
      <g opacity="0.6">
        <ellipse cx="120" cy="60" rx="50" ry="20" fill="white" />
        <ellipse cx="150" cy="55" rx="35" ry="18" fill="white" />
        <ellipse cx="90" cy="55" rx="30" ry="15" fill="white" />
      </g>
      <g opacity="0.4">
        <ellipse cx="620" cy="45" rx="60" ry="22" fill="white" />
        <ellipse cx="660" cy="40" rx="40" ry="18" fill="white" />
        <ellipse cx="585" cy="42" rx="30" ry="14" fill="white" />
      </g>
      <g opacity="0.3">
        <ellipse cx="400" cy="30" rx="40" ry="15" fill="white" />
        <ellipse cx="425" cy="27" rx="25" ry="12" fill="white" />
      </g>

      {/* Sonne */}
      <circle cx="700" cy="60" r="30" fill="#fbbf24" opacity="0.8" />
      <circle cx="700" cy="60" r="40" fill="#fbbf24" opacity="0.15" />

      {/* --- Häuser --- */}

      {/* Haus 1 — links, cremefarben mit rotem Dach */}
      <rect x="60" y="210" width="90" height="110" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      <polygon points="55,215 105,170 155,215" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5" />
      <rect x="80" y="235" width="20" height="25" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="115" y="235" width="20" height="25" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="92" y="285" width="26" height="35" rx="2" fill="#92400e" stroke="#78350f" strokeWidth="1" />
      <circle cx="113" cy="303" r="2" fill="#fbbf24" />

      {/* Haus 2 — Mitte-links, weiss mit grünem Dach */}
      <rect x="200" y="195" width="100" height="125" rx="4" fill="white" stroke="#9ca3af" strokeWidth="1.5" />
      <polygon points="195,200 250,150 305,200" fill="#4CAF87" stroke="#3d9a73" strokeWidth="1.5" />
      <rect x="218" y="225" width="22" height="28" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="260" y="225" width="22" height="28" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="235" y="280" width="30" height="40" rx="2" fill="#92400e" stroke="#78350f" strokeWidth="1" />
      <circle cx="259" cy="300" r="2" fill="#fbbf24" />
      {/* Blumenkasten */}
      <rect x="216" y="253" width="26" height="5" rx="1" fill="#92400e" />
      <circle cx="222" cy="250" r="3" fill="#f472b6" />
      <circle cx="229" cy="249" r="3" fill="#fb923c" />
      <circle cx="236" cy="250" r="3" fill="#f472b6" />

      {/* Haus 3 — Mitte-rechts, gelb mit Fachwerk */}
      <rect x="490" y="200" width="95" height="120" rx="4" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
      <polygon points="485,205 537,155 590,205" fill="#78350f" stroke="#713f12" strokeWidth="1.5" />
      {/* Fachwerk-Linien */}
      <line x1="537" y1="205" x2="537" y2="320" stroke="#92400e" strokeWidth="1.5" />
      <line x1="490" y1="260" x2="585" y2="260" stroke="#92400e" strokeWidth="1.5" />
      <rect x="506" y="225" width="20" height="25" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="550" y="225" width="20" height="25" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="524" y="280" width="26" height="40" rx="2" fill="#92400e" stroke="#78350f" strokeWidth="1" />

      {/* Haus 4 — rechts, rosa mit braunem Dach */}
      <rect x="640" y="215" width="85" height="105" rx="4" fill="#fce7f3" stroke="#db2777" strokeWidth="1" />
      <polygon points="635,220 682,175 730,220" fill="#a16207" stroke="#854d0e" strokeWidth="1.5" />
      <rect x="655" y="240" width="18" height="22" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="690" y="240" width="18" height="22" rx="2" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="668" y="285" width="24" height="35" rx="2" fill="#92400e" stroke="#78350f" strokeWidth="1" />

      {/* Kirchturm / Rathaus in der Mitte */}
      <rect x="370" y="170" width="60" height="150" rx="3" fill="#f5f5f4" stroke="#a8a29e" strokeWidth="1.5" />
      <polygon points="365,175 400,120 435,175" fill="#4CAF87" stroke="#3d9a73" strokeWidth="1.5" />
      <circle cx="400" cy="150" r="6" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <rect x="388" y="200" width="24" height="35" rx="8" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="385" y="280" width="30" height="40" rx="2" fill="#78350f" />

      {/* --- Bäume --- */}

      {/* Baum links */}
      <rect x="168" y="260" width="8" height="60" rx="2" fill="#92400e" />
      <ellipse cx="172" cy="245" rx="25" ry="30" fill="#22c55e" opacity="0.8" />
      <ellipse cx="165" cy="250" rx="18" ry="22" fill="#4ade80" opacity="0.6" />

      {/* Baum rechts */}
      <rect x="610" y="265" width="7" height="55" rx="2" fill="#92400e" />
      <ellipse cx="613" cy="250" rx="22" ry="28" fill="#22c55e" opacity="0.8" />
      <ellipse cx="618" cy="255" rx="16" ry="20" fill="#4ade80" opacity="0.6" />

      {/* Kleiner Busch */}
      <ellipse cx="460" cy="315" rx="18" ry="12" fill="#22c55e" opacity="0.6" />
      <ellipse cx="340" cy="318" rx="14" ry="10" fill="#4ade80" opacity="0.5" />

      {/* --- Menschen --- */}

      {/* Älterer Herr mit Gehstock — links */}
      <g transform="translate(130, 290)">
        {/* Kopf */}
        <circle cx="0" cy="0" r="8" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        {/* Haare (grau) */}
        <path d="M-6,-5 Q0,-10 6,-5" stroke="#9ca3af" strokeWidth="2" fill="none" />
        {/* Körper */}
        <line x1="0" y1="8" x2="0" y2="30" stroke="#2D3142" strokeWidth="3" strokeLinecap="round" />
        {/* Arme */}
        <line x1="0" y1="14" x2="-10" y2="24" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="14" x2="10" y2="22" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        {/* Beine */}
        <line x1="0" y1="30" x2="-6" y2="45" stroke="#2D3142" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="0" y1="30" x2="6" y2="45" stroke="#2D3142" strokeWidth="2.5" strokeLinecap="round" />
        {/* Gehstock */}
        <line x1="10" y1="22" x2="14" y2="45" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        {/* Lächeln */}
        <path d="M-3,2 Q0,5 3,2" stroke="#92400e" strokeWidth="0.8" fill="none" />
      </g>

      {/* Ältere Dame — bei Haus 4 */}
      <g transform="translate(660, 290)">
        <circle cx="0" cy="0" r="8" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        {/* Haare (weiss/grau, Dutt) */}
        <circle cx="0" cy="-8" r="5" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.5" />
        {/* Kleid */}
        <path d="M0,8 L-8,35 L8,35 Z" fill="#c084fc" stroke="#a855f7" strokeWidth="1" />
        {/* Arme */}
        <line x1="-4" y1="14" x2="-12" y2="24" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="14" x2="12" y2="22" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        {/* Beine */}
        <line x1="-3" y1="35" x2="-5" y2="45" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="35" x2="5" y2="45" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        {/* Lächeln */}
        <path d="M-3,2 Q0,5 3,2" stroke="#92400e" strokeWidth="0.8" fill="none" />
        {/* Einkaufstasche */}
        <rect x="11" y="18" width="8" height="10" rx="1" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
      </g>

      {/* Junge Frau mit Kind — Mitte */}
      <g transform="translate(400, 300)">
        {/* Mutter */}
        <circle cx="0" cy="-8" r="8" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        {/* Lange Haare */}
        <path d="M-7,-10 Q-8,0 -5,5" stroke="#92400e" strokeWidth="2" fill="none" />
        <path d="M7,-10 Q8,0 5,5" stroke="#92400e" strokeWidth="2" fill="none" />
        {/* Körper */}
        <path d="M0,0 L-7,28 L7,28 Z" fill="#4CAF87" stroke="#3d9a73" strokeWidth="1" />
        {/* Arme */}
        <line x1="-3" y1="8" x2="-12" y2="16" stroke="#4CAF87" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="8" x2="14" y2="12" stroke="#4CAF87" strokeWidth="2" strokeLinecap="round" />
        {/* Beine */}
        <line x1="-3" y1="28" x2="-4" y2="38" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="28" x2="4" y2="38" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        {/* Lächeln */}
        <path d="M-3,-6 Q0,-3 3,-6" stroke="#92400e" strokeWidth="0.8" fill="none" />

        {/* Kind (kleiner, daneben) */}
        <circle cx="18" cy="8" r="6" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        <line x1="18" y1="14" x2="18" y2="28" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="18" x2="14" y2="24" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="28" x2="15" y2="38" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="28" x2="21" y2="38" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        {/* Kind Lächeln */}
        <path d="M16,10 Q18,13 20,10" stroke="#92400e" strokeWidth="0.8" fill="none" />
      </g>

      {/* Junger Mann — Fahrrad andeutung */}
      <g transform="translate(540, 295)">
        <circle cx="0" cy="0" r="7" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        {/* Kurze Haare */}
        <path d="M-5,-5 Q0,-9 5,-5" stroke="#78350f" strokeWidth="2.5" fill="none" />
        {/* T-Shirt */}
        <path d="M0,7 L-6,30 L6,30 Z" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
        {/* Arme */}
        <line x1="-3" y1="12" x2="-11" y2="20" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="12" x2="11" y2="18" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        {/* Beine */}
        <line x1="-3" y1="30" x2="-5" y2="42" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="30" x2="5" y2="42" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        {/* Lächeln */}
        <path d="M-3,2 Q0,5 3,2" stroke="#92400e" strokeWidth="0.8" fill="none" />
        {/* Winken */}
        <line x1="11" y1="18" x2="16" y2="10" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Frau mit Hund — rechts */}
      <g transform="translate(740, 298)">
        <circle cx="0" cy="0" r="7" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        <path d="M-6,-4 Q0,-8 6,-4" stroke="#dc2626" strokeWidth="2" fill="none" />
        <path d="M0,7 L-6,28 L6,28 Z" fill="#f472b6" stroke="#ec4899" strokeWidth="1" />
        <line x1="-3" y1="12" x2="-10" y2="22" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="12" x2="10" y2="20" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        <line x1="-3" y1="28" x2="-4" y2="38" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="28" x2="4" y2="38" stroke="#2D3142" strokeWidth="2" strokeLinecap="round" />
        {/* Hund */}
        <ellipse cx="-18" cy="32" rx="8" ry="5" fill="#d97706" />
        <circle cx="-24" cy="28" r="4" fill="#d97706" />
        <circle cx="-26" cy="27" r="1" fill="#1e1e1e" />
        <line x1="-10" y1="30" x2="-10" y2="20" stroke="#78350f" strokeWidth="1" />
        {/* Leine */}
        <path d="M-10,20 Q-5,18 3,12" stroke="#78350f" strokeWidth="0.8" fill="none" />
        {/* Schwanz */}
        <path d="M-10,30 Q-8,24 -6,26" stroke="#d97706" strokeWidth="1.5" fill="none" />
      </g>

      {/* Bankje / Parkbank */}
      <rect x="440" y="335" width="40" height="3" rx="1" fill="#78350f" />
      <rect x="443" y="338" width="3" height="10" fill="#78350f" />
      <rect x="474" y="338" width="3" height="10" fill="#78350f" />
      <rect x="440" y="330" width="40" height="3" rx="1" fill="#92400e" />

      {/* Blumen im Vordergrund */}
      <circle cx="50" cy="345" r="3" fill="#f472b6" />
      <circle cx="58" cy="348" r="3" fill="#fb923c" />
      <circle cx="44" cy="350" r="2.5" fill="#a78bfa" />
      <line x1="50" y1="348" x2="50" y2="358" stroke="#22c55e" strokeWidth="1" />
      <line x1="58" y1="351" x2="58" y2="360" stroke="#22c55e" strokeWidth="1" />
      <line x1="44" y1="352" x2="44" y2="360" stroke="#22c55e" strokeWidth="1" />

      <circle cx="750" cy="350" r="3" fill="#f472b6" />
      <circle cx="758" cy="347" r="2.5" fill="#fbbf24" />
      <circle cx="763" cy="352" r="3" fill="#c084fc" />
      <line x1="750" y1="353" x2="750" y2="362" stroke="#22c55e" strokeWidth="1" />
      <line x1="758" y1="350" x2="758" y2="358" stroke="#22c55e" strokeWidth="1" />
      <line x1="763" y1="355" x2="763" y2="362" stroke="#22c55e" strokeWidth="1" />

      {/* Vögel */}
      <path d="M250,80 Q255,75 260,80" stroke="#6b7280" strokeWidth="1.2" fill="none" />
      <path d="M270,70 Q275,65 280,70" stroke="#6b7280" strokeWidth="1.2" fill="none" />
      <path d="M500,55 Q505,50 510,55" stroke="#6b7280" strokeWidth="1" fill="none" />
    </svg>
  );
}
