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
import { LEIHBOERSE_CATEGORIES } from "@/lib/constants";

const TYPES = [
  { id: "lend", label: "Ich verleihe etwas", icon: "🔄", desc: "Sie haben etwas, das Nachbarn ausleihen können" },
  { id: "borrow", label: "Ich suche etwas", icon: "🔍", desc: "Sie benötigen etwas zum Ausleihen" },
] as const;

export default function LeihboerseNewPage() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deposit, setDeposit] = useState("");
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Nicht angemeldet.");
        setSaving(false);
        return;
      }

      // 1. Eintrag erstellen
      const { data: inserted, error: insertError } = await supabase
        .from("leihboerse_items")
        .insert({
          user_id: user.id,
          quarter_id: currentQuarter?.id,
          type,
          category,
          title: title.trim(),
          description: description.trim() || null,
          deposit: deposit.trim() || null,
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

      // 2. Bild hochladen (falls vorhanden)
      if (pendingFiles.length > 0) {
        setUploading(true);
        try {
          const url = await uploadCategoryImage(supabase, "leihboerse", inserted.id, pendingFiles[0].file);
          await supabase
            .from("leihboerse_items")
            .update({ image_url: url })
            .eq("id", inserted.id);
        } catch {
          // Bild-Upload-Fehler ueberspringen
        }
        setUploading(false);
      }

      toast.success(type === "borrow" ? "Anfrage erfolgreich erstellt!" : "Angebot erfolgreich erstellt!");
      setStep(4);
    } catch {
      toast.error("Netzwerkfehler.");
      setError("Netzwerkfehler.");
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {uploading && <UploadingOverlay />}

      <div className="flex items-center gap-3">
        <Link href="/leihboerse" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {type === "borrow" ? "Neue Anfrage" : "Neues Angebot"}
        </h1>
      </div>

      {/* Schrittanzeige */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-quartier-green" : "bg-muted"}`} />
        ))}
      </div>

      {/* Schritt 1: Typ */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Was möchten Sie tun?</p>
          <div className="grid grid-cols-1 gap-3">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setType(t.id); setStep(2); }}
                className="flex items-center gap-4 rounded-xl border-2 border-border bg-white p-4 text-left transition-all hover:border-quartier-green hover:shadow-md"
              >
                <span className="text-3xl">{t.icon}</span>
                <div>
                  <span className="font-semibold text-anthrazit">{t.label}</span>
                  <p className="text-sm text-muted-foreground">{t.desc}</p>
                </div>
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
            {LEIHBOERSE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === c.id
                    ? "bg-quartier-green text-white"
                    : "bg-white text-anthrazit border border-border hover:border-quartier-green"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {category && (
            <div className="space-y-3">
              <Input
                placeholder={type === "lend" ? "Was verleihen Sie? (z.B. 'Bohrmaschine Bosch')" : "Was suchen Sie? (z.B. 'Leiter 3m')"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />
              <Textarea
                placeholder="Beschreibung (optional): Zustand, Größe, Besonderheiten..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
              {type === "lend" && (
                <Input
                  placeholder="Pfand (optional, z.B. '20€')"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  maxLength={30}
                />
              )}

              {/* Bild-Upload */}
              <ImageUpload
                images={[]}
                onImagesChange={() => {}}
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                maxImages={1}
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

      {/* Schritt 3: Vorschau */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Zusammenfassung:</p>
          <div className="rounded-xl border-2 border-border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              {TYPES.find((t) => t.id === type)?.icon}{" "}
              {TYPES.find((t) => t.id === type)?.label} —{" "}
              {LEIHBOERSE_CATEGORIES.find((c) => c.id === category)?.icon}{" "}
              {LEIHBOERSE_CATEGORIES.find((c) => c.id === category)?.label}
            </p>
            <h3 className="mt-1 text-lg font-bold text-anthrazit">{title}</h3>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            {deposit && <p className="mt-2 text-sm font-medium text-anthrazit">Pfand: {deposit}</p>}
            {pendingFiles.length > 0 && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingFiles[0].preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Zurück</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? "Wird erstellt..." : type === "borrow" ? "Anfrage erstellen" : "Angebot erstellen"}
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
          <h2 className="text-lg font-bold text-anthrazit">
            {type === "borrow" ? "Anfrage erstellt!" : "Angebot erstellt!"}
          </h2>
          <p className="mt-2 text-muted-foreground">Ihre Nachbarn können es jetzt sehen.</p>
          <Button onClick={() => router.push("/leihboerse")} className="mt-4 bg-quartier-green hover:bg-quartier-green-dark">
            Zur Leihbörse
          </Button>
        </div>
      )}
    </div>
  );
}
