// app/(app)/jugend/badges/page.tsx
// Jugend-Modul: Badges-Uebersicht
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BadgeCard } from "@/modules/youth";

interface Badge {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  earned_at?: string;
}

export default function JugendBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBadges() {
      const supabase = createClient();

      // Alle Badges laden
      const { data: allBadges } = await supabase
        .from("youth_badges")
        .select("id, slug, title, description, icon_url")
        .order("created_at");

      if (allBadges) {
        setBadges(allBadges);
      }

      // Verdiente Badges laden
      if (user) {
        const { data: earned } = await supabase
          .from("youth_earned_badges")
          .select("badge_id, earned_at")
          .eq("user_id", user.id);

        if (earned) {
          setEarnedIds(new Set(earned.map((e) => e.badge_id)));
        }
      }

      setLoading(false);
    }

    loadBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-6">
        <div className="h-48 animate-pulse rounded-[24px] bg-white/10" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-5 text-white">
      <Link
        href="/jugend"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 px-3 py-2 text-sm font-bold text-cyan-50/78"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück
      </Link>

      <header className="mt-5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/14 text-amber-100 ring-1 ring-amber-100/25">
          <Medal className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight">
          Meine Badges
        </h1>
        <p className="mt-2 text-sm leading-6 text-cyan-50/70">
          Sichtbare Erfolge für Aufgaben und Engagement im Quartier.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            title={badge.title}
            description={badge.description}
            earned={earnedIds.has(badge.id)}
            iconUrl={badge.icon_url || undefined}
          />
        ))}
      </div>
    </div>
  );
}
