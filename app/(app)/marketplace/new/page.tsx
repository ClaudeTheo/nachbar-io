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
import { MARKETPLACE_TYPES, MARKETPLACE_CATEGORIES } from "@/lib/constants";

export default function MarketplaceNewPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!type || !category || !title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Nicht angemeldet.");
        setSaving(false);
        return;
      }

      // 1. Inserat erstellen
      const { data: inserted, error: insertError } = await supabase
        .from("marketplace_items")
        .insert({
          user_id: user.id,
          type,
          category,
          title: title.trim(),
          description: description.trim() || null,
          price: price ? parseFloat(price) : null,
          images: [],
          status: "active",
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        toast.error("Speichern fehlgeschlagen.");
        setError("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      // 2. Bilder hochladen (falls vorhanden)
      if (pendingFiles.length > 0) {
        setUploading(true);
        const imageUrls: string[] = [];

        for (const pf of pendingFiles) {
          try {
            const url = await uploadCategoryImage(supabase, "marketplace", inserted.id, pf.file);
            imageUrls.push(url);
          } catch {
            // Einzelne Fehler ueberspringen
          }
        }

        // 3. Inserat mit Bild-URLs aktualisieren
        if (imageUrls.length > 0) {
          await supabase
            .from("marketplace_items")
            .update({ images: imageUrls })
            .eq("id", inserted.id);
        }
        setUploading(false);
      }

      toast.success("Inserat erfolgreich erstellt!");
      setStep(4);
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
        <Link href="/marketplace" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Neues Inserat</h1>
      </div>

      {/* Schrittanzeige */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              s <= step ? "bg-quartier-green" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Schritt 1: Typ waehlen */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Was möchten Sie tun?</p>
          <div className="grid grid-cols-2 gap-3">
            {MARKETPLACE_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setType(t.id);
                  setStep(2);
                }}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-white p-4 transition-all hover:border-quartier-green hover:shadow-md"
              >
                <span className="text-3xl">{t.icon}</span>
                <span className="font-medium text-anthrazit">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schritt 2: Kategorie + Details */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Kategorie wählen:</p>
          <div className="flex flex-wrap gap-2">
            {MARKETPLACE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === c.id
                    ? "bg-quartier-green text-white"
                    : "bg-white text-anthrazit border border-border hover:border-quartier-green"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {category && (
            <div className="space-y-3">
              <Input
                placeholder="Titel (z.B. 'Bohrmaschine zu verleihen')"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
              <Textarea
                placeholder="Beschreibung (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
              {(type === "sell" || type === "lend") && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Preis in €"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.5"
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">€</span>
                </div>
              )}

              {/* Bilder-Upload */}
              <ImageUpload
                images={[]}
                onImagesChange={() => {}}
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                maxImages={3}
              />

              <Button
                onClick={() => setStep(3)}
                disabled={!title.trim()}
                className="w-full bg-quartier-green hover:bg-quartier-green-dark"
              >
                Weiter
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Schritt 3: Vorschau + Absenden */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Zusammenfassung:</p>
          <div className="rounded-xl border-2 border-border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              {MARKETPLACE_TYPES.find((t) => t.id === type)?.icon}{" "}
              {MARKETPLACE_TYPES.find((t) => t.id === type)?.label} —{" "}
              {MARKETPLACE_CATEGORIES.find((c) => c.id === category)?.label}
            </p>
            <h3 className="mt-1 text-lg font-bold text-anthrazit">{title}</h3>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            {price && <p className="mt-2 font-bold text-anthrazit">{price} €</p>}
            {pendingFiles.length > 0 && (
              <div className="mt-3 flex gap-2">
                {pendingFiles.map((pf, i) => (
                  <img key={i} src={pf.preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? "Wird erstellt..." : "Inserat erstellen"}
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 4: Erfolg */}
      {step === 4 && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10">
            <Check className="h-8 w-8 text-quartier-green" />
          </div>
          <h2 className="text-lg font-bold text-anthrazit">Inserat erstellt!</h2>
          <p className="mt-2 text-muted-foreground">
            Ihr Inserat ist jetzt für alle Nachbarn sichtbar.
          </p>
          <Button
            onClick={() => router.push("/marketplace")}
            className="mt-4 bg-quartier-green hover:bg-quartier-green-dark"
          >
            Zum Marktplatz
          </Button>
        </div>
      )}
    </div>
  );
}
