"use client";

// Dashboard-Sektion: Hilfe-Börse mit Wegwischen + 24h Filter
// Standardmaessig eingeklappt — nur Header + Anzahl sichtbar
// Per Tap aufklappbar, einzelne Anfragen per Swipe/X ausblendbar

import { useState, useRef } from "react";
import Link from "next/link";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { haptic } from "@/lib/haptics";

interface HelpRequest {
  id: string;
  title: string;
  type: "need" | "offer";
  created_at: string;
  user?: { display_name: string; avatar_url: string | null } | null;
}

const STORAGE_KEY = "dismissed_help_requests";
const MAX_AGE_HOURS = 24;

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as { ids: string[]; timestamp: number };
    if (Date.now() - parsed.timestamp > MAX_AGE_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ids: [...ids], timestamp: Date.now() }),
  );
}

export function HelpRequestsSection({ requests }: { requests: HelpRequest[] }) {
  const [dismissedIds, setDismissedIds] = useState(() => getDismissedIds());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [mountedAt] = useState(() => Date.now());
  const touchStartX = useRef(0);

  const visibleRequests = requests.filter((req) => {
    if (dismissedIds.has(req.id)) return false;
    const hoursAgo =
      (mountedAt - new Date(req.created_at).getTime()) / (1000 * 60 * 60);
    return hoursAgo <= MAX_AGE_HOURS;
  });

  function handleDismiss(id: string) {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    saveDismissedIds(newDismissed);
  }

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    haptic("light");
  }

  function handleTouchStart(e: React.TouchEvent, id: string) {
    touchStartX.current = e.touches[0].clientX;
    setSwipeOffset(0);
    setSwipingId(id);
  }

  function handleTouchMove(e: React.TouchEvent) {
    setSwipeOffset(e.touches[0].clientX - touchStartX.current);
  }

  function handleTouchEnd(id: string) {
    if (Math.abs(swipeOffset) > 80) {
      handleDismiss(id);
    }
    setSwipingId(null);
    setSwipeOffset(0);
  }

  if (visibleRequests.length === 0) return null;

  return (
    <section>
      {/* Kompakter Header — Tap zum Auf-/Zuklappen */}
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); haptic("light"); }}
        className="mb-2 flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-anthrazit">Hilfe-Börse</h2>
          <span className="text-xs font-medium text-quartier-green bg-quartier-green/10 px-1.5 py-0.5 rounded-full">
            {visibleRequests.length}
          </span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Aufklappbarer Inhalt */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl bg-white shadow-soft overflow-hidden divide-y divide-[#ebe5dd]">
            {visibleRequests.map((req) => {
              const hoursAgo = Math.floor(
                (mountedAt - new Date(req.created_at).getTime()) /
                  (1000 * 60 * 60),
              );
              const isSwiping = swipingId === req.id;
              const isExpanded = expandedId === req.id;

              return (
                <div
                  key={req.id}
                  className="relative"
                  onTouchStart={(e) => handleTouchStart(e, req.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(req.id)}
                >
                  {isSwiping && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-sm z-10">
                      Ausblenden
                    </div>
                  )}

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-3 px-4 text-left transition-all hover:bg-muted/30 active:bg-muted/50"
                    onClick={() => handleToggle(req.id)}
                    aria-expanded={isExpanded}
                    style={{
                      transform: isSwiping
                        ? `translateX(${swipeOffset}px)`
                        : undefined,
                    }}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${req.type === "need" ? "bg-alert-amber" : "bg-quartier-green"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-anthrazit truncate">
                        {req.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.user?.display_name}
                      </p>
                    </div>
                    {hoursAgo < 2 && (
                      <span className="shrink-0 text-[10px] font-medium text-quartier-green bg-quartier-green/10 px-1.5 py-0.5 rounded-full">
                        Neu
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDismiss(req.id);
                      }}
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-anthrazit transition-colors"
                      aria-label="Ausblenden"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-3 pl-9">
                        <p className="text-sm text-anthrazit mb-1">{req.title}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={req.type === "need" ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {req.type === "need" ? "Gesucht" : "Angebot"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {hoursAgo === 0 ? "Gerade eben" : `vor ${hoursAgo}h`}
                          </span>
                        </div>
                        <Link
                          href={`/help/${req.id}`}
                          className="text-xs font-medium text-quartier-green hover:underline"
                        >
                          Details ansehen →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Link zur vollen Liste */}
          <Link
            href="/help"
            className="mt-2 flex items-center justify-center text-xs font-medium text-quartier-green hover:underline py-1"
          >
            Alle anzeigen <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
