"use client";

import { useState } from "react";
import { ArrowLeft, Newspaper, ChevronDown, ChevronUp } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";
import type { NewsItem } from "@/lib/terminal/useTerminalData";

/**
 * NewsScreen: Zeigt Quartiersnachrichten als scrollbare Karten-Liste.
 * Jede Karte kann per Tap aufgeklappt werden (vollstaendige Zusammenfassung).
 * Senior-UX: Grosse Schrift, 80px+ Touch-Targets, hoher Kontrast.
 */

// Kategorie-Farben passend zum Design-System
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  community: { bg: "bg-quartier-green/15", text: "text-quartier-green" },
  event: { bg: "bg-info-blue/15", text: "text-info-blue" },
  safety: { bg: "bg-alert-amber/15", text: "text-alert-amber" },
  traffic: { bg: "bg-anthrazit/15", text: "text-anthrazit" },
  health: { bg: "bg-emergency-red/15", text: "text-emergency-red" },
  culture: { bg: "bg-purple-100", text: "text-purple-700" },
  politics: { bg: "bg-anthrazit/10", text: "text-anthrazit/80" },
};

// Fallback-Farbe fuer unbekannte Kategorien
const DEFAULT_CATEGORY_COLOR = { bg: "bg-anthrazit/10", text: "text-anthrazit/70" };

/**
 * Berechnet eine lesbare "vor X"-Zeitangabe auf Deutsch.
 */
function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Gerade eben";
  if (diffMinutes < 60) return `Vor ${diffMinutes} Min.`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Vor ${diffHours} Std.`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;

  // Aeltere Artikel: Datum anzeigen
  return date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });
}

export default function NewsScreen() {
  const { data, setActiveScreen } = useTerminal();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const news = data?.news ?? [];

  // Karte auf-/zuklappen (Toggle)
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Kopfzeile mit Zurueck-Button */}
      <div className="flex items-center gap-4 px-6 py-4 shrink-0">
        <button
          onClick={() => setActiveScreen("home")}
          aria-label="Zurueck zur Startseite"
          className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-anthrazit/10 text-anthrazit transition-transform active:scale-95"
        >
          <ArrowLeft className="h-10 w-10" />
        </button>
        <h1 className="text-3xl font-bold text-anthrazit">Neuigkeiten</h1>
      </div>

      {/* Nachrichten-Liste oder Leer-Zustand */}
      {news.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex flex-col gap-5">
            {news.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={() => toggleExpand(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Leerer Zustand: Freundliche Nachricht wenn keine Neuigkeiten vorhanden.
 */
function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
      <Newspaper className="h-24 w-24 text-anthrazit/30" />
      <p className="text-3xl font-bold text-anthrazit">
        Keine Neuigkeiten
      </p>
      <p className="text-xl text-anthrazit/60 text-center">
        Im Moment gibt es keine neuen Nachrichten aus Ihrem Quartier.
      </p>
    </div>
  );
}

/**
 * Einzelne Nachrichten-Karte: Titel, Kategorie-Badge, Zeitangabe.
 * Aufklappbar fuer vollstaendige Zusammenfassung.
 */
function NewsCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: NewsItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryColor = CATEGORY_COLORS[item.category] ?? DEFAULT_CATEGORY_COLOR;
  const ExpandIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`${item.title} – ${isExpanded ? "zuklappen" : "aufklappen"}`}
      className="w-full rounded-2xl bg-white p-6 shadow-md text-left transition-all active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-quartier-green"
    >
      {/* Obere Zeile: Kategorie-Badge + Zeitangabe */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-base font-semibold ${categoryColor.bg} ${categoryColor.text}`}
        >
          {item.categoryLabel}
        </span>
        <span className="text-base text-anthrazit/50 whitespace-nowrap">
          {timeAgo(item.publishedAt)}
        </span>
      </div>

      {/* Titel */}
      <h2 className="text-2xl font-bold text-anthrazit leading-snug mb-2">
        {item.title}
      </h2>

      {/* Zusammenfassung: Gekuerzt oder Volltext je nach Expand-Status */}
      {item.summary && (
        <p
          className={`text-xl text-anthrazit/70 leading-relaxed ${
            isExpanded ? "" : "line-clamp-2"
          }`}
        >
          {item.summary}
        </p>
      )}

      {/* Aufklapp-Indikator */}
      {item.summary && (
        <div className="flex items-center justify-center mt-4 text-anthrazit/40">
          <ExpandIcon className="h-7 w-7" />
        </div>
      )}
    </button>
  );
}
