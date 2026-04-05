"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

interface Badge {
  key: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export function BadgeGallery() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/badges")
      .then((r) => r.json())
      .then(setBadges)
      .catch(() => {});
  }, [user]);

  if (badges.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Abzeichen
        </p>
        <div className="grid grid-cols-4 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.key}
              className={`flex flex-col items-center text-center gap-1 ${
                badge.earned ? "" : "opacity-30 grayscale"
              }`}
              title={
                badge.earned
                  ? `${badge.title}: ${badge.description}`
                  : `${badge.title} — noch nicht freigeschaltet`
              }
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {badge.title}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
