"use client";

// Wiederverwendbare Foto-Upload-Komponente
// Unterstützt Kamera-Aufnahme, Galerie-Auswahl, Client-seitige Komprimierung
// und Upload in einen Supabase Storage Bucket.

import { useState, useRef, useCallback } from "react";
import { Camera, ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// --- Props ---

export interface PhotoUploadProps {
  /** Supabase Storage Bucket Name */
  bucket: string;
  /** Callback wenn Foto hochgeladen wurde */
  onPhotoUploaded: (url: string, preview: string) => void;
  /** Callback wenn Foto entfernt wurde */
  onPhotoRemoved: () => void;
  /** Aktuelles Foto (Preview-URL) */
  photoPreview: string | null;
  /** Maximale Dateigröße in Bytes (Standard: 2 MB) */
  maxSize?: number;
  /** Maximale Breite nach Komprimierung (Standard: 1200px) */
  maxWidth?: number;
  /** JPEG-Qualität 0-1 (Standard: 0.8) */
  quality?: number;
  /** Hinweistext unter den Buttons */
  hint?: string;
}

// --- Bildkomprimierung ---

async function compressImage(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Komprimierung fehlgeschlagen")),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// --- Komponente ---

export function PhotoUpload({
  bucket,
  onPhotoUploaded,
  onPhotoRemoved,
  photoPreview,
  maxSize = 2 * 1024 * 1024,
  maxWidth = 1200,
  quality = 0.8,
  hint,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);

  // Versteckte Datei-Inputs
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // --- Datei verarbeiten ---

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validierung: nur Bilder
      if (!file.type.startsWith("image/")) {
        toast.error("Bitte wählen Sie ein Bild aus.");
        return;
      }

      // Validierung: max doppelte Größe vor Komprimierung
      if (file.size > maxSize * 2) {
        toast.error(
          `Das Bild ist zu groß (max. ${Math.round((maxSize * 2) / 1024 / 1024)} MB vor Komprimierung).`,
        );
        return;
      }

      setUploading(true);

      try {
        // Komprimieren
        const compressed = await compressImage(file, maxWidth, quality);

        // Prüfen ob komprimiertes Bild unter maxSize liegt
        if (compressed.size > maxSize) {
          toast.error(
            `Das Bild ist auch nach Komprimierung zu groß (max. ${Math.round(maxSize / 1024 / 1024)} MB).`,
          );
          setUploading(false);
          return;
        }

        // Vorschau erstellen
        const previewUrl = URL.createObjectURL(compressed);

        // Hochladen in Supabase Storage
        const supabase = createClient();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressed, {
            contentType: "image/jpeg",
            cacheControl: "3600",
          });

        if (error) {
          toast.error(
            "Foto-Upload fehlgeschlagen. Bitte versuchen Sie es erneut.",
          );
          console.error("Storage upload error:", error);
          setUploading(false);
          return;
        }

        // Oeffentliche URL holen
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        onPhotoUploaded(urlData.publicUrl, previewUrl);
      } catch (err) {
        console.error("Bildverarbeitung fehlgeschlagen:", err);
        toast.error("Bildverarbeitung fehlgeschlagen.");
      } finally {
        setUploading(false);
        // Input zurücksetzen (damit dasselbe Bild nochmal gewählt werden kann)
        e.target.value = "";
      }
    },
    [bucket, maxSize, maxWidth, quality, onPhotoUploaded],
  );

  // --- Foto entfernen ---

  const handleRemove = useCallback(() => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    onPhotoRemoved();
  }, [photoPreview, onPhotoRemoved]);

  // --- Render ---

  return (
    <div className="space-y-3">
      {/* Versteckte Datei-Inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Foto-Vorschau oder Auswahl-Buttons */}
      {photoPreview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt="Foto-Vorschau"
            className="w-full rounded-xl object-cover shadow-soft"
            style={{ maxHeight: 300 }}
          />
          <button
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            aria-label="Foto entfernen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Kamera */}
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl bg-white p-4 shadow-soft transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
            ) : (
              <Camera className="h-8 w-8 text-quartier-green" />
            )}
            <span className="text-sm font-medium text-anthrazit">Kamera</span>
          </button>

          {/* Galerie */}
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl bg-white p-4 shadow-soft transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
            ) : (
              <ImageIcon className="h-8 w-8 text-quartier-green" />
            )}
            <span className="text-sm font-medium text-anthrazit">Galerie</span>
          </button>
        </div>
      )}

      {/* Optionaler Hinweis */}
      {hint && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          {hint}
        </div>
      )}
    </div>
  );
}
