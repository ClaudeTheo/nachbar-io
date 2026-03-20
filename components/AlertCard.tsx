"use client";

import { Clock, MapPin, User } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReputationBadge } from "@/components/ReputationBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ALERT_CATEGORIES } from "@/lib/constants";
import { ALERT_ICON_MAP, FALLBACK_ICON } from "@/lib/category-icons";
import type { Alert } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface AlertCardProps {
  alert: Alert;
  onHelp?: (alertId: string) => void;
  onView?: (alertId: string) => void;
  compact?: boolean;
  reputationLevel?: number; // Optionales Reputations-Level des Erstellers
}

export function AlertCard({ alert, onHelp, onView, compact = false, reputationLevel }: AlertCardProps) {
  const category = ALERT_CATEGORIES.find((c) => c.id === alert.category);
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), {
    addSuffix: true,
    locale: de,
  });

  const statusConfig = {
    open: { label: "Offen", className: "bg-alert-amber text-white" },
    help_coming: { label: "Hilfe unterwegs", className: "bg-quartier-green text-white" },
    resolved: { label: "Erledigt", className: "bg-gray-400 text-white" },
  };

  const status = statusConfig[alert.status];

  return (
    <Card
      className={`card-interactive overflow-hidden shadow-soft ${
        alert.status === "open" ? "border-alert-amber/50" : ""
      } ${compact ? "" : "cursor-pointer"}`}
      onClick={() => onView?.(alert.id)}
      role="article"
      aria-label={`Hilfeanfrage: ${alert.title}`}
      data-testid="alert-card"
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start gap-3">
          {/* Kategorie-Icon mit Puls bei offenen Alerts */}
          {(() => {
            const iconConfig = ALERT_ICON_MAP[alert.category] ?? FALLBACK_ICON;
            const isOpen = alert.status === "open";
            return (
              <CategoryIcon
                icon={iconConfig.icon}
                bgColor={isOpen ? iconConfig.bgColor : "bg-muted"}
                iconColor={isOpen ? iconConfig.iconColor : "text-muted-foreground"}
                size="lg"
                className={isOpen ? "animate-pulse-alert" : ""}
              />
            );
          })()}

          {/* Inhalt */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate font-semibold text-anthrazit">
                {alert.title}
              </h3>
              <Badge className={`shrink-0 ${status.className}`}>
                {status.label}
              </Badge>
            </div>

            {!compact && alert.description && (
              <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                {alert.description}
              </p>
            )}

            {/* Meta-Informationen */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {alert.household && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {alert.household.street_name} {alert.household.house_number}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {timeAgo}
              </span>
              {alert.user && (
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {alert.user.display_name}
                  {reputationLevel && reputationLevel >= 2 && (
                    <ReputationBadge level={reputationLevel} size="sm" />
                  )}
                </span>
              )}
            </div>

            {/* Hilfe-Button bei offenen Alerts */}
            {alert.status === "open" && onHelp && !compact && (
              <Button
                size="sm"
                className="mt-3 bg-quartier-green hover:bg-quartier-green-dark"
                onClick={(e) => {
                  e.stopPropagation();
                  onHelp(alert.id);
                }}
              >
                Ich kann helfen
              </Button>
            )}

            {/* Helfer anzeigen bei help_coming */}
            {alert.status === "help_coming" && alert.responses && alert.responses.length > 0 && (
              <p className="mt-2 text-sm font-medium text-quartier-green">
                {alert.responses[0].responder?.display_name} ist unterwegs
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
