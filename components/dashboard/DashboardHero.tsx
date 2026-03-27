"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ReputationBadge } from "@/components/ReputationBadge";
import { IllustrationRenderer } from "@/components/illustrations/IllustrationRenderer";
import { DailyCheckinButton } from "@/components/care/DailyCheckinButton";
import { useUnreadCount } from "@/lib/useUnreadCount";
import type { CategoryIconConfig } from "@/lib/category-icons";

interface DashboardHeroProps {
  userName: string;
  avatarUrl: string | null;
  reputationLevel: number;
  greeting: { text: string; timeKey: string };
  greetingIcon: CategoryIconConfig;
}

export function DashboardHero({
  userName,
  avatarUrl,
  reputationLevel,
  greeting,
  greetingIcon,
}: DashboardHeroProps) {
  const { count: unreadCount } = useUnreadCount();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-quartier-green/10 via-quartier-green/5 to-transparent shadow-hero">
      {/* Strichzeichnung als Hintergrund */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <IllustrationRenderer
          name="ill-01-dorfplatz"
          width="100%"
          height="100%"
          animated
        />
      </div>

      {/* Inhalt darueber */}
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Profilbild"
                className="h-16 w-16 rounded-full object-cover border-2 border-quartier-green/20 flex-shrink-0"
                data-testid="dashboard-avatar"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-full bg-anthrazit text-white font-bold text-xl flex items-center justify-center flex-shrink-0"
                data-testid="dashboard-avatar"
              >
                {userName ? userName.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <div>
              <h1
                className="flex items-center gap-2 text-2xl font-bold text-anthrazit"
                data-testid="dashboard-greeting"
              >
                {userName ? (
                  <>
                    <CategoryIcon
                      icon={greetingIcon.icon}
                      bgColor={greetingIcon.bgColor}
                      iconColor={greetingIcon.iconColor}
                      size="lg"
                    />
                    {greeting.text}, {userName}
                  </>
                ) : (
                  "QuartierApp"
                )}
                {reputationLevel >= 2 && (
                  <span className="ml-1.5 align-middle">
                    <ReputationBadge level={reputationLevel} size="sm" />
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ihr Quartier auf einen Blick
              </p>
            </div>
          </div>
          <Link
            href="/notifications"
            className="relative rounded-full p-2 transition-colors hover:bg-white/50"
            aria-label="Benachrichtigungen"
            data-testid="notification-bell"
          >
            <Bell className="h-6 w-6 text-anthrazit" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="animate-badge-pop absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emergency-red text-xs font-bold text-white"
                data-testid="unread-badge"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
        <div className="mt-4">
          <DailyCheckinButton />
        </div>
      </div>
    </div>
  );
}
