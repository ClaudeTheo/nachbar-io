"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HelpRequest,
  HELP_CATEGORY_LABELS,
} from "@/modules/hilfe/services/types";

/** Emoji-Icons je Kategorie */
const CATEGORY_ICONS: Record<string, string> = {
  shopping: "🛒",
  company: "🚶",
  handwork: "🏠",
  garden: "🌱",
  tech: "💻",
  tutoring: "📖",
  transport: "🚗",
  childcare: "👶",
  pet_care: "🐾",
  package: "📦",
  noise: "🔊",
  board: "📋",
  whohas: "🔍",
  other: "❓",
};

/** Status-Farben und Labels */
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  active: { label: "Offen", variant: "default" },
  matched: { label: "Vermittelt", variant: "secondary" },
  closed: { label: "Abgeschlossen", variant: "outline" },
};

interface HelpRequestCardProps {
  request: HelpRequest;
  onApply?: (id: string) => void;
  showApplyButton?: boolean;
}

/** Karte für ein einzelnes Hilfe-Gesuch (Senior-Mode: große Schrift, 80px min-height) */
export function HelpRequestCard({
  request,
  onApply,
  showApplyButton = true,
}: HelpRequestCardProps) {
  const icon = CATEGORY_ICONS[request.category] ?? "❓";
  const label = HELP_CATEGORY_LABELS[request.category] ?? request.category;
  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.active;

  // Beschreibung auf 100 Zeichen kürzen
  const description = request.description
    ? request.description.length > 100
      ? request.description.slice(0, 100) + "…"
      : request.description
    : "Keine Beschreibung";

  return (
    <Card className="min-h-[80px] border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl" aria-hidden="true">
            {icon}
          </span>
          <span>{request.title || label}</span>
        </CardTitle>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="text-base text-gray-700">{description}</p>
      </CardContent>

      {showApplyButton && request.status === "active" && onApply && (
        <CardFooter>
          <Button
            className="min-h-[48px] w-full text-base font-semibold"
            onClick={() => onApply(request.id)}
          >
            Ich helfe
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
