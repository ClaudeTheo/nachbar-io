// components/care/KioskPhotoUpload.tsx
// Nachbar.io — Foto-Upload und -Verwaltung fuer den Kiosk (Caregiver-Seite)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Pin,
  PinOff,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizePhoto } from "@/lib/device/photo-resize";

interface KioskPhoto {
  id: string;
  household_id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  pinned: boolean;
  visible: boolean;
  created_at: string;
  url: string | null;
}

interface KioskPhotoUploadProps {
  householdId: string;
}

export function KioskPhotoUpload({ householdId }: KioskPhotoUploadProps) {
  const [photos, setPhotos] = useState<KioskPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fotos laden
  const fetchPhotos = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/caregiver/kiosk-photos?household_id=${householdId}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Laden");
      }
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Foto hochladen
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Input zuruecksetzen fuer erneuten Upload
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    setError(null);

    try {
      // Bild auf 1280x800 WebP resizen
      const blob = await resizePhoto(file);

      // Eindeutigen Pfad generieren
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const storagePath = `${householdId}/${timestamp}_${uuid}.webp`;

      // In Supabase Storage hochladen
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("kiosk-photos")
        .upload(storagePath, blob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Metadaten via API anlegen
      const res = await fetch("/api/caregiver/kiosk-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: householdId,
          storage_path: storagePath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Foto konnte nicht gespeichert werden");
      }

      // Liste neu laden
      await fetchPhotos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  // Foto-Aktion: Pinned/Visible umschalten
  const togglePhotoFlag = async (
    photoId: string,
    field: "pinned" | "visible",
    currentValue: boolean
  ) => {
    setError(null);
    try {
      const res = await fetch(`/api/caregiver/kiosk-photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Aktualisierung fehlgeschlagen");
      }

      // Lokal aktualisieren
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, [field]: !currentValue } : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    }
  };

  // Foto loeschen
  const deletePhoto = async (photoId: string) => {
    if (!confirm("Dieses Foto wirklich löschen?")) return;

    setError(null);
    try {
      const res = await fetch(`/api/caregiver/kiosk-photos/${photoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header mit Upload-Button und Zaehler */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {photos.length} / 200 Fotos
        </p>

        <label className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green-dark cursor-pointer transition-colors">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Foto hochladen
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading || photos.length >= 200}
            className="sr-only"
          />
        </label>
      </div>

      {/* Fehler */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Leerer Zustand */}
      {photos.length === 0 && !error && (
        <div className="rounded-xl border-2 border-dashed border-muted p-8 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-anthrazit">
            Noch keine Fotos
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Laden Sie Fotos hoch, die auf dem Kiosk-Terminal im Haushalt
            angezeigt werden.
          </p>
        </div>
      )}

      {/* Foto-Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-lg overflow-hidden border bg-card aspect-video"
            >
              {/* Bild */}
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Kiosk-Foto"}
                  className={`w-full h-full object-cover ${
                    !photo.visible ? "opacity-40" : ""
                  }`}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Status-Badges */}
              <div className="absolute top-1.5 left-1.5 flex gap-1">
                {photo.pinned && (
                  <span className="rounded bg-alert-amber/90 px-1.5 py-0.5 text-xs font-medium text-white">
                    Gepinnt
                  </span>
                )}
                {!photo.visible && (
                  <span className="rounded bg-gray-700/80 px-1.5 py-0.5 text-xs font-medium text-white">
                    Ausgeblendet
                  </span>
                )}
              </div>

              {/* Hover-Aktionen */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    togglePhotoFlag(photo.id, "pinned", photo.pinned)
                  }
                  className="rounded-full bg-white/90 p-2 hover:bg-white transition-colors"
                  title={photo.pinned ? "Loslösen" : "Anheften"}
                >
                  {photo.pinned ? (
                    <PinOff className="h-4 w-4 text-anthrazit" />
                  ) : (
                    <Pin className="h-4 w-4 text-anthrazit" />
                  )}
                </button>

                <button
                  onClick={() =>
                    togglePhotoFlag(photo.id, "visible", photo.visible)
                  }
                  className="rounded-full bg-white/90 p-2 hover:bg-white transition-colors"
                  title={photo.visible ? "Ausblenden" : "Einblenden"}
                >
                  {photo.visible ? (
                    <EyeOff className="h-4 w-4 text-anthrazit" />
                  ) : (
                    <Eye className="h-4 w-4 text-anthrazit" />
                  )}
                </button>

                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="rounded-full bg-white/90 p-2 hover:bg-red-50 transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="h-4 w-4 text-emergency-red" />
                </button>
              </div>

              {/* Bildunterschrift */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
