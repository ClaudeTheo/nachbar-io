"use client";

// EventRecap — Nachbericht mit Fotos nach Event-Ende
// Erscheint auf Event-Detailseite wenn event_date < heute

import { useState, useEffect } from "react";
import { Camera, Send, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { validateImageFile, compressImage, MAX_DIMENSION } from "@/lib/storage";

interface EventRecapData {
  id: string;
  user_id: string;
  text: string | null;
  images: string[];
  created_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

interface EventRecapProps {
  eventId: string;
  eventDate: string;
  currentUserId: string | null;
}

export function EventRecap({
  eventId,
  eventDate,
  currentUserId,
}: EventRecapProps) {
  const [recaps, setRecaps] = useState<EventRecapData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Nur anzeigen wenn Event vorbei ist
  const isPast = new Date(eventDate + "T23:59:59") < new Date();

  async function loadRecaps() {
    const supabase = createClient();
    const { data } = await supabase
      .from("event_recaps")
      .select("id, user_id, text, images, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    setRecaps((data ?? []) as EventRecapData[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!isPast) return;
    loadRecaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isPast]);

  // Eigener Nachbericht bereits vorhanden?
  const hasOwnRecap = recaps.some((r) => r.user_id === currentUserId);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (selectedFiles.length + files.length > 5) {
      toast.error("Maximal 5 Bilder erlaubt.");
      return;
    }

    for (const file of files) {
      const err = validateImageFile(file);
      if (err) {
        toast.error(err);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);

    // Vorschauen generieren
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!text.trim() && selectedFiles.length === 0) {
      toast.error(
        "Bitte geben Sie einen Text ein oder laden Sie ein Bild hoch.",
      );
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const imageUrls: string[] = [];

      // Bilder hochladen
      for (const file of selectedFiles) {
        const blob = await compressImage(file, MAX_DIMENSION);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const uuid = crypto.randomUUID();
        const path = `events/${eventId}/recap/${uuid}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(path, blob, { contentType: blob.type });

        if (uploadError) {
          toast.error("Bild-Upload fehlgeschlagen.");
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      // Nachbericht speichern
      const { error } = await supabase.from("event_recaps").insert({
        event_id: eventId,
        user_id: currentUserId,
        text: text.trim() || null,
        images: imageUrls,
      });

      if (error) {
        toast.error(`Fehler: ${error.message}`);
        setSaving(false);
        return;
      }

      toast.success("Nachbericht gespeichert!");
      setShowForm(false);
      setText("");
      setSelectedFiles([]);
      setPreviews([]);
      loadRecaps();
    } catch (err) {
      console.error("Nachbericht-Fehler:", err);
      toast.error("Ein Fehler ist aufgetreten.");
    }
    setSaving(false);
  }

  if (!isPast) return null;
  if (loading) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-anthrazit">Rückblick</h3>

      {/* Bestehende Nachberichte */}
      {recaps.length > 0 && (
        <div className="space-y-3">
          {recaps.map((recap) => (
            <div
              key={recap.id}
              className="rounded-xl border border-border bg-white p-4 space-y-2"
            >
              {recap.text && (
                <p className="text-sm text-muted-foreground">{recap.text}</p>
              )}
              {recap.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {recap.images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Rückblick Foto ${i + 1}`}
                      className="h-32 w-32 rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(recap.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Eigenen Nachbericht erstellen */}
      {currentUserId && !hasOwnRecap && !showForm && (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <Camera className="mr-2 h-4 w-4" />
          Wie war&apos;s? Nachbericht verfassen
        </Button>
      )}

      {showForm && (
        <div className="rounded-xl border-2 border-quartier-green/30 bg-white p-4 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Wie war die Veranstaltung?"
            rows={3}
            maxLength={500}
          />
          <p className="text-right text-xs text-muted-foreground">
            {text.length}/500
          </p>

          {/* Bild-Vorschauen */}
          {previews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {previews.map((preview, i) => (
                <div key={i} className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Vorschau ${i + 1}`}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
              <ImageIcon className="h-4 w-4" />
              Foto ({selectedFiles.length}/5)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setText("");
                setSelectedFiles([]);
                setPreviews([]);
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || (!text.trim() && selectedFiles.length === 0)}
              className="bg-quartier-green hover:bg-quartier-green-dark"
            >
              <Send className="mr-1 h-4 w-4" />
              {saving ? "Wird gespeichert..." : "Senden"}
            </Button>
          </div>
        </div>
      )}

      {recaps.length === 0 && !showForm && !currentUserId && (
        <p className="text-sm text-muted-foreground">
          Noch kein Rückblick vorhanden.
        </p>
      )}
    </div>
  );
}
