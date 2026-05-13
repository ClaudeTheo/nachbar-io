import Image from "next/image";

import { cn } from "@/lib/utils";

const PARALLAX_BASE = "/brand/parallax";

const L4_VIGNETTES: ReadonlyArray<{
  key: string;
  src: string;
  width: number;
  height: number;
  classes: string;
}> = [
  {
    key: "l4-sparrow",
    src: `${PARALLAX_BASE}/l4-sparrow.png`,
    width: 200,
    height: 198,
    classes:
      "qs-bird-fly top-[13vh] right-[7%] w-[54px] opacity-[0.38]",
  },
  {
    key: "l4-bench",
    src: `${PARALLAX_BASE}/l4-bench.png`,
    width: 322,
    height: 184,
    classes: "top-[44vh] left-[3%] w-[82px] opacity-[0.38]",
  },
  {
    key: "l4-windowbox",
    src: `${PARALLAX_BASE}/l4-windowbox.png`,
    width: 273,
    height: 206,
    classes: "top-[59vh] right-[5%] w-[64px] opacity-[0.40]",
  },
  {
    key: "l4-signpost",
    src: `${PARALLAX_BASE}/l4-signpost.png`,
    width: 197,
    height: 224,
    classes: "top-[73vh] left-[7%] w-[58px] opacity-[0.35]",
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
      <div
        data-layer="l1"
        className="qs-l1 absolute left-0 top-0 w-full opacity-[0.18] mix-blend-multiply"
      >
        <Image
          src={`${PARALLAX_BASE}/l1-schwarzwald.png`}
          alt=""
          width={1454}
          height={231}
          sizes="100vw"
          priority={false}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </div>

      <div
        data-layer="l2"
        className="qs-l2 absolute left-0 top-[34vh] w-full opacity-[0.14] mix-blend-multiply"
      >
        <Image
          src={`${PARALLAX_BASE}/l2-hochrhein.png`}
          alt=""
          width={1448}
          height={165}
          sizes="100vw"
          priority={false}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </div>

      <div
        data-layer="l3"
        className="qs-l3 absolute left-0 top-[78vh] w-full opacity-[0.20] mix-blend-multiply"
      >
        <Image
          src={`${PARALLAX_BASE}/l3-skyline.png`}
          alt=""
          width={1462}
          height={340}
          sizes="100vw"
          priority={false}
          draggable={false}
          className="block h-auto w-full select-none"
        />
      </div>

      <div data-l4-group="true" className="hidden sm:block">
        {L4_VIGNETTES.map((vignette) => (
          <div
            key={vignette.key}
            data-layer={vignette.key}
            className={cn("absolute mix-blend-multiply", vignette.classes)}
          >
            <Image
              src={vignette.src}
              alt=""
              width={vignette.width}
              height={vignette.height}
              sizes="96px"
              priority={false}
              draggable={false}
              className="h-auto w-full select-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
