"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/ExternalLink";
import { CategoryIcon } from "@/components/CategoryIcon";
import { NEWS_ICON_MAP, FALLBACK_ICON } from "@/lib/category-icons";
import type { NewsItem } from "@/lib/supabase/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface NewsCardProps {
  item: NewsItem;
}

const categoryConfig: Record<string, { label: string; icon: string }> = {
  infrastructure: { label: "Infrastruktur", icon: "🚧" },
  events: { label: "Veranstaltung", icon: "🎭" },
  administration: { label: "Verwaltung", icon: "🏛️" },
  weather: { label: "Wetter", icon: "☀️" },
  waste: { label: "Entsorgung", icon: "🗑️" },
  other: { label: "Sonstiges", icon: "📰" },
};

// Relevanz-Farbe basierend auf Score (0-10)
function relevanceColor(score: number): string {
  if (score >= 8) return "bg-quartier-green text-white";
  if (score >= 6) return "bg-quartier-green/20 text-quartier-green";
  if (score >= 4) return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
}

function relevanceLabel(score: number): string {
  if (score >= 8) return "Sehr relevant";
  if (score >= 6) return "Relevant";
  if (score >= 4) return "Etwas relevant";
  return "Wenig relevant";
}

export function NewsCard({ item }: NewsCardProps) {
  const cat = categoryConfig[item.category] ?? categoryConfig.other;
  const date = item.published_at
    ? format(new Date(item.published_at), "dd. MMM yyyy", { locale: de })
    : format(new Date(item.created_at), "dd. MMM yyyy", { locale: de });

  return (
    <Card className="card-interactive shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {(() => {
            const iconConfig = NEWS_ICON_MAP[item.category] ?? FALLBACK_ICON;
            return (
              <CategoryIcon
                icon={iconConfig.icon}
                bgColor={iconConfig.bgColor}
                iconColor={iconConfig.iconColor}
                size="md"
              />
            );
          })()}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {cat.label}
              </Badge>
              <Badge className={`text-xs ${relevanceColor(item.relevance_score)}`}>
                {relevanceLabel(item.relevance_score)}
              </Badge>
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
            <h3 className="mb-1 font-semibold text-anthrazit">
              {item.original_title}
            </h3>
            <p className="text-sm text-muted-foreground">{item.ai_summary}</p>
            {item.source_url && (
              <ExternalLink
                href={item.source_url}
                title="Originalquelle"
                className="mt-2 inline-flex items-center gap-1 text-xs text-info-blue hover:underline"
              >
                <ArrowSquareOut size={12} />
                Originalquelle
              </ExternalLink>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
