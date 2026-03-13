"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PRESET_AVATARS,
  resolveAvatarUrl,
  uploadAvatar,
  validateImageFile,
} from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  userId: string;
  disabled?: boolean;
}

export function AvatarPicker({
  currentAvatarUrl,
  onAvatarChange,
  userId,
  disabled,
}: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"preset" | "upload">("preset");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolved = resolveAvatarUrl(currentAvatarUrl);

  // Preset waehlen
  function handlePresetSelect(presetId: string) {
    onAvatarChange(`preset:${presetId}`);
    setOpen(false);
  }

  // Foto hochladen
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const publicUrl = await uploadAvatar(supabase, userId, file);
      onAvatarChange(publicUrl);
      setOpen(false);
      toast.success("Avatar gespeichert!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      // File-Input zuruecksetzen
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            disabled={disabled}
            className="group relative mx-auto flex flex-col items-center gap-1"
            type="button"
          />
        }
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-quartier-green/10 text-4xl transition-shadow group-hover:ring-2 group-hover:ring-quartier-green/30">
          {resolved.type === "image" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolved.value}
              alt="Avatar"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{resolved.value}</span>
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1.5 shadow-md transition-transform group-hover:scale-110">
          <Camera className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-xs text-quartier-green">Ändern</span>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avatar wählen</DialogTitle>
        </DialogHeader>

        {/* Tab-Umschalter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("preset")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === "preset"
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            type="button"
          >
            Symbol wählen
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === "upload"
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            type="button"
          >
            Foto hochladen
          </button>
        </div>

        {/* Preset-Grid */}
        {tab === "preset" && (
          <div className="grid grid-cols-4 gap-3">
            {PRESET_AVATARS.map((preset) => {
              const isActive = currentAvatarUrl === `preset:${preset.id}`;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all active:scale-95 ${
                    isActive
                      ? "border-quartier-green bg-quartier-green/10"
                      : "border-border hover:border-quartier-green/50"
                  }`}
                  style={{ minHeight: "80px", minWidth: "80px" }}
                  type="button"
                >
                  <span className="text-3xl">{preset.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Foto-Upload */}
        {tab === "upload" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-32 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border transition-colors hover:border-quartier-green/50 hover:bg-quartier-green/5 active:scale-[0.98]"
              style={{ minHeight: "80px" }}
              type="button"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
                  <span className="text-sm text-muted-foreground">
                    Wird hochgeladen...
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Foto auswählen
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    JPEG, PNG oder WebP · max. 2 MB
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
