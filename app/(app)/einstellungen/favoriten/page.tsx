"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Favorite {
  id: string;
  source_type: string;
  source_id: string;
  sort_order: number;
  display_name: string;
  avatar_url: string | null;
  target_user_id: string | null;
  phone_number?: string;
}

export default function FavoritenPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await fetch("/api/speed-dial");
      if (!res.ok) throw new Error("Laden fehlgeschlagen");
      const data = await res.json();
      setFavorites(Array.isArray(data) ? data : []);
    } catch {
      setError("Favoriten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  async function removeFavorite(id: string) {
    try {
      const res = await fetch(`/api/speed-dial?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen");
      await loadFavorites();
    } catch {
      setError("Kontakt konnte nicht entfernt werden.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-anthrazit">
          Favoriten für Schnellwahl
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bis zu 5 Kontakte, die auf dem Kiosk als große Kacheln angezeigt
          werden. Ein Tipp genügt zum Anrufen.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Aktuelle Favoriten */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Aktuelle Favoriten
          </h2>
          <span className="text-sm text-muted-foreground">
            {favorites.length}/5
          </span>
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground shadow-soft">
            <p className="mb-2 text-3xl">&#x1F4DE;</p>
            <p>Noch keine Favoriten hinzugefügt.</p>
          </div>
        ) : (
          favorites
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                    {fav.display_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-anthrazit">
                      {fav.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Platz {fav.sort_order}
                      {fav.phone_number ? ` \u00B7 ${fav.phone_number}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFavorite(fav.id)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-700"
                  aria-label={`${fav.display_name} entfernen`}
                >
                  Entfernen
                </Button>
              </div>
            ))
        )}
      </div>

      {/* Hinweis */}
      <p className="text-xs text-muted-foreground">
        Favoriten werden aus Ihren Notfallkontakten und verknüpften Angehörigen
        zusammengestellt. Änderungen werden sofort auf Ihrem Kiosk-Gerät
        übernommen.
      </p>
    </div>
  );
}
