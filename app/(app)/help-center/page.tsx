"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Search, Rocket, MapPin, MessageCircle,
  TriangleAlert, User, Shield, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { HELP_CATEGORIES, type HelpCategory } from "@/lib/help-content";

const ICON_MAP: Record<string, React.ElementType> = {
  rocket: Rocket,
  map: MapPin,
  message: MessageCircle,
  alert: TriangleAlert,
  user: User,
  shield: Shield,
};

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Suche: Filtert Kategorien und Items
  const filteredCategories = search.trim()
    ? HELP_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(search.toLowerCase()) ||
            item.answer.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.items.length > 0)
    : HELP_CATEGORIES;

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <PageHeader
        title="Hilfecenter"
        subtitle="Antworten auf häufige Fragen"
        backHref="/dashboard"
        className="mb-4"
      />

      {/* Suchfeld */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Frage suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <p className="mt-1 text-xs text-muted-foreground">
            {totalResults} {totalResults === 1 ? "Ergebnis" : "Ergebnisse"} gefunden
          </p>
        )}
      </div>

      {/* Kategorien */}
      {filteredCategories.length === 0 ? (
        <div className="py-8 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Keine Ergebnisse für &ldquo;{search}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Versuchen Sie andere Suchbegriffe
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              openItems={openItems}
              onToggle={toggleItem}
            />
          ))}
        </div>
      )}

      {/* Kontakt-Hinweis */}
      <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Ihre Frage war nicht dabei?
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Kontaktieren Sie den Quartiers-Administrator über die Nachrichten-Funktion.
        </p>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  openItems,
  onToggle,
}: {
  category: HelpCategory;
  openItems: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const Icon = ICON_MAP[category.icon] ?? Rocket;

  return (
    <div>
      {/* Kategorie-Header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-quartier-green/10">
          <Icon className="h-3.5 w-3.5 text-quartier-green" />
        </div>
        <h2 className="text-sm font-semibold text-anthrazit">{category.title}</h2>
      </div>

      {/* Akkordeon */}
      <div className="space-y-1">
        {category.items.map((item, idx) => {
          const key = `${category.id}-${idx}`;
          const isOpen = openItems[key];

          return (
            <div
              key={key}
              className="rounded-lg border border-border bg-white overflow-hidden"
            >
              <button
                onClick={() => onToggle(key)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-anthrazit transition-colors hover:bg-muted/30"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/10 px-3 py-2.5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
