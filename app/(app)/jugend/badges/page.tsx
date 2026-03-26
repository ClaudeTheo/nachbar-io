// app/(app)/jugend/badges/page.tsx
// Jugend-Modul: Badges-Uebersicht
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BadgeCard } from "@/components/youth/BadgeCard";
import { PageHeader } from "@/components/ui/page-header";

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
      <div className="p-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Meine Badges"
        subtitle="Sammle Badges durch Aufgaben und Engagement."
        backHref="/jugend"
      />

      <div className="space-y-3">
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
