"use client";

// Dashboard-Sektion: Hilfe-Börse mit Wegwischen + 24h Filter
// Nutzer können einzelne Anfragen per Swipe/X-Button ausblenden
// Nur Anfragen der letzten 24h werden angezeigt

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    // Dismissed-Liste nach 24h zurücksetzen
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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    setDismissedIds(getDismissedIds());
  }, []);

  // Nur letzte 24h + nicht dismissed
  const visibleRequests = requests.filter((req) => {
    if (dismissedIds.has(req.id)) return false;
    /* eslint-disable react-hooks/purity */
    const hoursAgo =
      (Date.now() - new Date(req.created_at).getTime()) / (1000 * 60 * 60);
    /* eslint-enable react-hooks/purity */
    return hoursAgo <= MAX_AGE_HOURS;
  });

  function handleDismiss(id: string) {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    saveDismissedIds(newDismissed);
  }

  // Touch-Events für Swipe-to-dismiss
  function handleTouchStart(e: React.TouchEvent, id: string) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setSwipingId(id);
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd(id: string) {
    // Mindestens 80px nach links oder rechts gewischt → dismiss
    if (Math.abs(touchDeltaX.current) > 80) {
      handleDismiss(id);
    }
    setSwipingId(null);
    touchDeltaX.current = 0;
  }

  if (visibleRequests.length === 0) return null;

  return (
    <section>
      <Link href="/help" className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-anthrazit">Hilfe-Börse</h2>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
      <div className="space-y-2">
        {visibleRequests.map((req) => {
          /* eslint-disable react-hooks/purity */
          const hoursAgo = Math.floor(
            (Date.now() - new Date(req.created_at).getTime()) /
              (1000 * 60 * 60),
          );
          /* eslint-enable react-hooks/purity */
          const isSwiping = swipingId === req.id;

          return (
            <div
              key={req.id}
              className="relative overflow-hidden rounded-xl"
              onTouchStart={(e) => handleTouchStart(e, req.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(req.id)}
            >
              {/* Dismiss-Hintergrund */}
              {isSwiping && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-sm">
                  Ausblenden
                </div>
              )}

              <Link
                href={`/help/${req.id}`}
                className="card-interactive flex items-center justify-between rounded-xl bg-card p-3 shadow-soft transition-transform"
                style={{
                  transform: isSwiping
                    ? `translateX(${touchDeltaX.current}px)`
                    : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-anthrazit truncate">
                    {req.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.user?.display_name} ·{" "}
                    {req.type === "need" ? "Sucht Hilfe" : "Bietet Hilfe"}
                    {hoursAgo < 2 && (
                      <span className="ml-1 text-quartier-green font-medium">
                        · Neu
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant={req.type === "need" ? "default" : "secondary"}
                  >
                    {req.type === "need" ? "Gesucht" : "Angebot"}
                  </Badge>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDismiss(req.id);
                    }}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-anthrazit transition-colors"
                    aria-label="Ausblenden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
