"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, UploadingOverlay, type PendingImage } from "@/components/ImageUpload";
import { uploadCategoryImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";

const LOST_FOUND_CATEGORIES = [
  { id: "keys", label: "Schlüssel", icon: "🔑" },
  { id: "wallet", label: "Geldbörse", icon: "👛" },
  { id: "phone", label: "Handy", icon: "📱" },
  { id: "pet", label: "Haustier", icon: "🐾" },
  { id: "clothing", label: "Kleidung", icon: "👕" },
  { id: "toy", label: "Spielzeug", icon: "🧸" },
  { id: "other", label: "Sonstiges", icon: "❓" },
];

export default function LostFoundNewPage() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"lost" | "found" | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!type || !title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Nicht angemeldet.");
        setSaving(false);
        return;
      }

      // 1. Meldung erstellen
      const { data: inserted, error: insertError } = await supabase
        .from("lost_found")
        .insert({
          user_id: user.id,
          quarter_id: currentQuarter?.id,
          type,
          category: category || "other",
          title: title.trim(),
          description: description.trim() || null,
          location_hint: locationHint.trim() || null,
          images: [],
          status: "open",
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        toast.error("Speichern fehlgeschlagen.");
        setError("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      // 2. Bilder hochladen
      if (pendingFiles.length > 0) {
        setUploading(true);
        const imageUrls: string[] = [];

        for (const pf of pendingFiles) {
          try {
            const url = await uploadCategoryImage(supabase, "lost-found", inserted.id, pf.file);
            imageUrls.push(url);
          } catch {
            // Einzelne Fehler ueberspringen
          }
        }

        if (imageUrls.length > 0) {
          await supabase
            .from("lost_found")
            .update({ images: imageUrls })
            .eq("id", inserted.id);
        }
        setUploading(false);
      }

      toast.success("Meldung erfolgreich erstellt!");
      setStep(3);
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setError("Netzwerkfehler.");
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {uploading && <UploadingOverlay />}

      <div className="flex items-center gap-3">
        <Link href="/lost-found" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Neue Meldung</h1>
      </div>

      {/* Schritt 1: Verloren oder Gefunden */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Was ist passiert?</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setType("lost"); setStep(2); }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-white p-6 transition-all hover:border-emergency-red hover:shadow-md"
            >
              <span className="text-4xl">😟</span>
              <span className="font-semibold text-anthrazit">Verloren</span>
              <span className="text-xs text-muted-foreground">Ich suche etwas</span>
            </button>
            <button
              onClick={() => { setType("found"); setStep(2); }}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-white p-6 transition-all hover:border-quartier-green hover:shadow-md"
            >
              <span className="text-4xl">🎉</span>
              <span className="font-semibold text-anthrazit">Gefunden</span>
              <span className="text-xs text-muted-foreground">Ich habe etwas gefunden</span>
            </button>
          </div>
        </div>
      )}

      {/* Schritt 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {type === "lost" ? "Was haben Sie verloren?" : "Was haben Sie gefunden?"}
          </p>

          <div className="flex flex-wrap gap-2">
            {LOST_FOUND_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === c.id
                    ? "bg-quartier-green text-white"
                    : "bg-white border border-border hover:border-quartier-green"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <Input
            placeholder={type === "lost" ? "z.B. 'Brauner Schlüsselbund mit 3 Schlüsseln'" : "z.B. 'Schwarze Geldbörse'"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />

          <Textarea
            placeholder="Beschreibung (optional, z.B. besondere Merkmale)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={300}
          />

          <Input
            placeholder="📍 Wo ungefähr? (z.B. 'Purkersdorfer Str. Höhe Nr. 5')"
            value={locationHint}
            onChange={(e) => setLocationHint(e.target.value)}
            maxLength={100}
          />

          {/* Bilder-Upload */}
          <ImageUpload
            images={[]}
            onImagesChange={() => {}}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
            maxImages={3}
          />

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? "Wird gespeichert..." : "Meldung erstellen"}
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 3: Erfolg */}
      {step === 3 && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10">
            <Check className="h-8 w-8 text-quartier-green" />
          </div>
          <h2 className="text-lg font-bold text-anthrazit">Meldung erstellt!</h2>
          <p className="mt-2 text-muted-foreground">
            Ihre Nachbarn werden informiert.
          </p>
          <Button
            onClick={() => router.push("/lost-found")}
            className="mt-4 bg-quartier-green hover:bg-quartier-green-dark"
          >
            Zum Fundbüro
          </Button>
        </div>
      )}
    </div>
  );
}
