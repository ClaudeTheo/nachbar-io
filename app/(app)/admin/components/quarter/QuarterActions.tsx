"use client";

// QuarterCard — Einzelne Quartier-Karte mit Aktionen und Details

import {
  Globe, MapPin, Users, Home, Shield, Edit, Archive,
  Settings, Activity, ChevronDown, ChevronUp, TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuarterWithStats } from "@/lib/quarters/types";
import { statusColors, statusLabels } from "./types";

// -------------------------------------------------------------------
// Props
// -------------------------------------------------------------------

interface QuarterCardProps {
  quarter: QuarterWithStats;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onManageAdmins: () => void;
  onStatusTransition: (target: string) => void;
}

// -------------------------------------------------------------------
// QuarterCard — Hauptkomponente
// -------------------------------------------------------------------

export function QuarterCard({
  quarter: q,
  expanded,
  onToggleExpand,
  onEdit,
  onManageAdmins,
  onStatusTransition,
}: QuarterCardProps) {
  const isArchived = q.status === "archived";

  return (
    <Card className={isArchived ? "opacity-60" : ""}>
      <CardContent className="pt-4">
        {/* Kopfzeile */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-quartier-green" />
              <h3 className="font-semibold text-anthrazit">{q.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] ${statusColors[q.status] ?? ""}`}
              >
                {statusLabels[q.status] ?? q.status}
              </Badge>
            </div>
            {q.city && (
              <p className="ml-6 mt-0.5 text-xs text-muted-foreground">
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {q.city}{q.state ? `, ${q.state}` : ""}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={isArchived}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onManageAdmins} disabled={isArchived}>
              <Shield className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats-Zeile */}
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            <span>{q.stats?.householdCount ?? 0} Haushalte</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{q.stats?.residentCount ?? 0} Bewohner</span>
          </div>
          {(q.stats?.activeAlerts ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <TriangleAlert className="h-3.5 w-3.5" />
              <span>{q.stats.activeAlerts} Alerts (24h)</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span>{q.stats?.activePosts ?? 0} Beitraege (7d)</span>
          </div>
        </div>

        {/* Erweiterte Details */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>Slug: <strong className="text-anthrazit">{q.slug}</strong></span>
              <span>Zentrum: {q.center_lat.toFixed(4)}, {q.center_lng.toFixed(4)}</span>
              <span>Invite-Praefix: <strong className="text-anthrazit">{q.invite_prefix ?? "—"}</strong></span>
              <span>Max. Haushalte: <strong className="text-anthrazit">{q.max_households}</strong></span>
              <span>Kontakt: {q.contact_email ?? "—"}</span>
              <span>Erstellt: {new Date(q.created_at).toLocaleDateString("de-DE")}</span>
            </div>

            {q.description && (
              <p className="text-xs text-muted-foreground">{q.description}</p>
            )}

            {/* Aktive Module */}
            <div className="flex flex-wrap gap-1">
              {q.settings?.enableCareModule && (
                <Badge variant="secondary" className="text-[10px]">Care</Badge>
              )}
              {q.settings?.enableMarketplace && (
                <Badge variant="secondary" className="text-[10px]">Marktplatz</Badge>
              )}
              {q.settings?.enableEvents && (
                <Badge variant="secondary" className="text-[10px]">Events</Badge>
              )}
              {q.settings?.enablePolls && (
                <Badge variant="secondary" className="text-[10px]">Umfragen</Badge>
              )}
            </div>

            {/* Status-Aktionen */}
            {!isArchived && (
              <div className="flex gap-2 pt-1">
                {q.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusTransition("active")}
                    className="text-xs text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <Activity className="mr-1 h-3.5 w-3.5" />
                    Aktivieren
                  </Button>
                )}
                {q.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusTransition("archived")}
                    className="text-xs text-muted-foreground"
                  >
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Archivieren
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onEdit} className="text-xs">
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  Einstellungen
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
