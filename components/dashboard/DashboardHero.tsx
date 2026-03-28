"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ReputationBadge } from "@/components/ReputationBadge";
import { IllustrationRenderer } from "@/components/illustrations/IllustrationRenderer";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { DailyCheckinButton } from "@/modules/care/components/checkin/DailyCheckinButton";
import { useUnreadCount } from "@/lib/useUnreadCount";
import type { CategoryIconConfig } from "@/lib/category-icons";

interface DashboardHeroProps {
  userName: string;
  avatarUrl: string | null;
  reputationLevel: number;
  greeting: { text: string; timeKey: string };
  greetingIcon: CategoryIconConfig;
  weatherIcon?: string;
  weatherTemp?: number | null;
  weatherDescription?: string;
}

export function DashboardHero({
  userName,
  avatarUrl,
  reputationLevel,
  greeting,
  greetingIcon,
  weatherIcon,
  weatherTemp,
  weatherDescription,
}: DashboardHeroProps) {
  const { count: unreadCount } = useUnreadCount();
  const hasWeather = weatherIcon && weatherDescription;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-quartier-green/10 via-quartier-green/5 to-transparent shadow-hero">
      {/* Wetter-Hintergrund (wenn Daten vorhanden) */}
      {hasWeather && (
        <WeatherWidget
          variant="hero"
          temp={weatherTemp ?? null}
          description={weatherDescription}
          icon={weatherIcon}
        />
      )}

      {/* Strichzeichnung als Hintergrund (Fallback ohne Wetter) */}
      {!hasWeather && (
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
          <IllustrationRenderer
            name="ill-01-dorfplatz"
            width="100%"
            height="100%"
            animated
          />
        </div>
      )}

      {/* Gradient-Overlay fuer Lesbarkeit ueber dem Wetter-Hintergrund */}
      {hasWeather && (
        <div className="absolute inset-0 z-[11] bg-gradient-to-r from-white/70 via-white/40 to-transparent pointer-events-none" />
      )}

      {/* Inhalt darüber (z-20 um ueber Wetter-Gradient zu liegen) */}
      <div className={`relative p-6 ${hasWeather ? "z-20" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Profilbild"
                className="h-12 w-12 rounded-full object-cover border-2 border-quartier-green/20 flex-shrink-0"
                data-testid="dashboard-avatar"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-full bg-anthrazit text-white font-bold text-lg flex items-center justify-center flex-shrink-0"
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
