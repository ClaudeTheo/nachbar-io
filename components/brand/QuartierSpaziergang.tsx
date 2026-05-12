import Image from "next/image";
import { cn } from "@/lib/utils";

// Visual-Polish v7 Iteration 2 — Welle 6 Quartier-Spaziergang Parallax.
//
// 4-Schichten-Atmosphaere hinter der App-Shell. Schwarzwald-Tannen oben,
// Hochrhein-Wellen in der Mitte, Bad-Saeckingen-Skyline (Holzbruecke +
// Fridolinsmuenster) weiter unten, und 4 Foreground-Vignetten (Sparrow,
// Bench, Windowbox, Marktplatz-Signpost) ueber den viewport verteilt.
//
// Z-Stack:
//   -z-20 (diese Schicht) — Quartier-Spaziergang
//   -z-10 — AppAquarellBackground (Symbol-Aquarell)
//   z-0..30 — App-Inhalte, NavPill, etc.
//
// Bewegung (Welle 7, compositor-only — keine JS-Animation-Loops):
//   .qs-l1 — Wind-Drift 6 px / 14 s (mobile 3 px)
//   .qs-l3 — Holzbruecken-Drift 8 px / 22 s (mobile 4 px)
//   .qs-bird-fly — Sparrow-Flug 0 -> 110 vw alle 90 s
//   .quartier-spaziergang — Watercolor-Breathe 0.94<->1.00 / 9 s
//
// Mobile (<=640 px): L4 + Vogel-Flug ausgeblendet, Drift-Amplituden
// halbiert. prefers-reduced-motion: alle Compositor-Animations off.
// Tageszeit-Tint-Phase-Fade laeuft separat (D, bereits live).

const PARALLAX_BASE = "/brand/parallax";

const L4_VIGNETTES: ReadonlyArray<{
  key: string;
  src: string;
  classes: string;
}> = [
  {
    // Sparrow — Hero-Bereich oben rechts (unter NavPill).
    key: "l4-sparrow",
    src: `${PARALLAX_BASE}/l4-sparrow.png`,
    classes:
      "qs-bird-fly top-[12vh] right-[6%] w-[78px] h-[58px] opacity-[0.50]",
  },
  {
    // Bench — mittlere Hoehe, linker Rand (Quartier-Info-Bereich).
    key: "l4-bench",
    src: `${PARALLAX_BASE}/l4-bench.png`,
    classes: "top-[42vh] left-[3%] w-[96px] h-[70px] opacity-[0.45]",
  },
  {
    // Windowbox — Schnellzugriffe-Bereich (rechts, mittlere Hoehe).
    key: "l4-windowbox",
    src: `${PARALLAX_BASE}/l4-windowbox.png`,
    classes: "top-[58vh] right-[4%] w-[72px] h-[62px] opacity-[0.50]",
  },
  {
    // Signpost "Marktplatz" — Nachbarschaft-Bereich, links unten.
    key: "l4-signpost",
    src: `${PARALLAX_BASE}/l4-signpost.png`,
    classes: "top-[72vh] left-[6%] w-[104px] h-[72px] opacity-[0.55]",
  },
];

interface QuartierSpaziergangProps {
  className?: string;
}

export function QuartierSpaziergang({ className }: QuartierSpaziergangProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="quartier-spaziergang"
      className={cn(
        "quartier-spaziergang pointer-events-none fixed inset-0 -z-20 overflow-hidden",
        className,
      )}
    >
      {/* L1 — Schwarzwald-Tannen am oberen Rand, dezenter Petrol-Wash. */}
      <div
        data-layer="l1"
        className="qs-l1 absolute left-0 top-0 w-full opacity-[0.12]"
      >
        <Image
          src={`${PARALLAX_BASE}/l1-schwarzwald.png`}
          alt=""
          width={1920}
          height={292}
          sizes="100vw"
          priority={false}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </div>

      {/* L2 — Hochrhein-Wellenlinien im mittleren Viewport-Drittel. */}
      <div
        data-layer="l2"
        className="qs-l2 absolute left-0 top-[30vh] w-full opacity-[0.18]"
      >
        <Image
          src={`${PARALLAX_BASE}/l2-hochrhein.png`}
          alt=""
          width={1920}
          height={1047}
          sizes="100vw"
          priority={false}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </div>

      {/* L3 — Bad-Saeckingen-Skyline (Holzbruecke, Haeuserzeile,
          Fridolinsmuenster) im unteren Viewport-Drittel. */}
      <div
        data-layer="l3"
        className="qs-l3 absolute left-0 top-[82vh] w-full opacity-[0.25]"
      >
        <Image
          src={`${PARALLAX_BASE}/l3-skyline.png`}
          alt=""
          width={1920}
          height={230}
          sizes="100vw"
          priority={false}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </div>

      {/* L4 — Foreground-Vignetten. Mobile (<=640 px) ausgeblendet
          (Brief Welle 6 Mobile-Disable). */}
      <div data-l4-group="true" className="hidden sm:block">
        {L4_VIGNETTES.map((v) => (
          <div
            key={v.key}
            data-layer={v.key}
            className={cn("absolute", v.classes)}
          >
            <Image
              src={v.src}
              alt=""
              fill
              sizes="120px"
              priority={false}
              draggable={false}
              className="select-none object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
