"use client";

import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { validateImageFile } from "@/lib/storage";
import { toast } from "sonner";

// Lokales Bild (noch nicht hochgeladen)
export interface PendingImage {
  file: File;
  preview: string; // URL.createObjectURL
}

interface ImageUploadProps {
  // Bereits hochgeladene Bild-URLs
  images: string[];
  onImagesChange: (urls: string[]) => void;
  // Lokale Dateien (noch nicht hochgeladen)
  pendingFiles: PendingImage[];
  onPendingFilesChange: (files: PendingImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  pendingFiles,
  onPendingFilesChange,
  maxImages = 3,
  disabled,
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const totalCount = images.length + pendingFiles.length;
  const canAdd = totalCount < maxImages;

  // Datei(en) hinzufügen
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxImages - totalCount;
    const newFiles: PendingImage[] = [];

    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      const error = validateImageFile(file);
      if (error) {
        toast.error(error);
        continue;
      }
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (newFiles.length > 0) {
      onPendingFilesChange([...pendingFiles, ...newFiles]);
    }

    // File-Input zurücksetzen
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Hochgeladenes Bild entfernen
  function handleRemoveUploaded(index: number) {
    setRemovingIndex(index);
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
    setTimeout(() => setRemovingIndex(null), 200);
  }

  // Lokales Bild entfernen
  function handleRemovePending(index: number) {
    const file = pendingFiles[index];
    URL.revokeObjectURL(file.preview);
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
  }

  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium">
        Fotos {maxImages > 1 ? `(max. ${maxImages})` : "(optional)"}
      </label>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Hochgeladene Bilder */}
        {images.map((url, i) => (
          <div
            key={`uploaded-${i}`}
            className={`relative shrink-0 transition-opacity ${
              removingIndex === i ? "opacity-0" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Bild ${i + 1}`}
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
            {!disabled && (
              <button
                onClick={() => handleRemoveUploaded(i)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                type="button"
                aria-label="Bild entfernen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Lokale Vorschau-Bilder */}
        {pendingFiles.map((pf, i) => (
          <div key={`pending-${i}`} className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pf.preview}
              alt={`Vorschau ${i + 1}`}
              className="h-24 w-24 rounded-lg border border-dashed border-quartier-green/50 object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-center rounded-lg bg-black/10">
              <span className="mb-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                Neu
              </span>
            </div>
            {!disabled && (
              <button
                onClick={() => handleRemovePending(i)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                type="button"
                aria-label="Bild entfernen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* Hinzufügen-Button */}
        {canAdd && !disabled && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border transition-colors hover:border-quartier-green/50 hover:bg-quartier-green/5 active:scale-95"
            type="button"
            style={{ minHeight: "80px", minWidth: "80px" }}
          >
            <Camera className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Foto</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={maxImages > 1}
        onChange={handleFileSelect}
        className="hidden"
      />

      {totalCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {totalCount}/{maxImages} Bild{maxImages > 1 ? "er" : ""}
        </p>
      )}
    </div>
  );
}

// Hilfskomponente für Upload-Fortschritt (in Submit-Flows)
export function UploadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl">
        <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
        <p className="text-sm font-medium">Bilder werden hochgeladen...</p>
      </div>
    </div>
  );
}
