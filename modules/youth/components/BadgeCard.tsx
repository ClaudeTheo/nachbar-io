// modules/youth/components/BadgeCard.tsx
// Jugend-Modul: Badge-Karte mit earned/locked State
import { Lock, Medal } from "lucide-react";

interface BadgeCardProps {
  title: string;
  description: string;
  earned: boolean;
  iconUrl?: string;
  earnedAt?: string;
}

export function BadgeCard({ title, description, earned, iconUrl, earnedAt }: BadgeCardProps) {
  return (
    <div
      className={`rounded-[20px] border p-4 transition-all ${
        earned
          ? "border-lime-200/36 bg-lime-300/12 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
          : "border-white/10 bg-white/[0.055] text-white/72"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
          earned ? "bg-lime-300/14 text-lime-100 ring-lime-100/25" : "bg-white/8 text-cyan-50/52 ring-white/10"
        }`}>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt="" className="w-8 h-8" />
          ) : (
            earned ? (
              <Medal className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Lock className="h-5 w-5" aria-hidden="true" />
            )
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-cyan-50/66">{description}</p>
          {earned && earnedAt && (
            <p className="mt-2 text-xs font-semibold text-lime-100">
              Verdient am {new Date(earnedAt).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
