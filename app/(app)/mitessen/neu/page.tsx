"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { calculateExpiry } from "@/lib/meals";
import { validateImageFile, compressImage, MAX_DIMENSION } from "@/lib/storage";
import type { MealType } from "@/lib/supabase/types";

type Step = 1 | 2 | 3 | 4;

export default function NewMealPage() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("2");
  const [mealDate, setMealDate] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [costHint, setCostHint] = useState("");
  const [pickupInfo, setPickupInfo] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  function handleTypeSelect(type: MealType) {
    setMealType(type);
    if (type === "portion" && !mealDate) {
      setMealDate(today);
    }
    setStep(2);
  }

  function handleDetailsNext() {
    if (!title.trim() || !mealDate || !servings) return;
    setStep(3);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!mealType || !title.trim() || !mealDate) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Bitte melden Sie sich erneut an.");
        setSaving(false);
        return;
      }

      // Foto hochladen (optional)
      let imageUrl: string | null = null;
      if (imageFile) {
        try {
          const blob = await compressImage(imageFile, MAX_DIMENSION);
          const ext = blob.type === "image/webp" ? "webp" : "jpg";
          const uuid = crypto.randomUUID();
          const path = `meals/${uuid}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("images")
            .upload(path, blob, { contentType: blob.type });

          if (uploadError) {
            console.error("Upload-Fehler:", uploadError);
          } else {
            const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.error("Bildkompression fehlgeschlagen:", err);
        }
      }

      const expiresAt = calculateExpiry(mealType, mealDate, mealTime || null);

      const { error: insertError } = await supabase.from("shared_meals").insert({
        user_id: user.id,
        quarter_id: currentQuarter?.id,
        type: mealType,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl,
        servings: parseInt(servings, 10),
        cost_hint: costHint.trim() || null,
        pickup_info: pickupInfo.trim() || null,
        meal_date: mealDate,
        meal_time: mealTime || null,
        expires_at: expiresAt,
        status: "active",
      });

      if (insertError) {
        console.error("Erstellung Fehler:", insertError);
        toast.error(`Fehler: ${insertError.message}`);
        setSaving(false);
        return;
      }

      toast.success(mealType === "portion"
        ? "Portion erfolgreich angeboten!"
        : "Einladung erfolgreich erstellt!"
      );
      setStep(4);
    } catch (err) {
      console.error("Netzwerkfehler:", err);
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mitessen" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {step === 1 && "Was möchten Sie anbieten?"}
          {step === 2 && "Details angeben"}
          {step === 3 && "Vorschau"}
          {step === 4 && "Erstellt!"}
        </h1>
      </div>

      {/* Schrittanzeige */}
      {step < 4 && (
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
      )}

      {/* Schritt 1: Typ wählen */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Wählen Sie, ob Sie Portionen abgeben oder zum Essen einladen möchten.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleTypeSelect("portion")}
              className="flex items-center gap-4 rounded-xl border-2 border-border bg-white p-5 transition-all hover:border-quartier-green hover:shadow-md active:scale-[0.98]"
              data-testid="type-portion"
            >
              <span className="text-4xl">🍲</span>
              <div className="text-left">
                <span className="text-lg font-semibold text-anthrazit">Portionen abgeben</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Schnell und spontan — Nachbarn holen ab
                </p>
              </div>
            </button>
            <button
              onClick={() => handleTypeSelect("invitation")}
              className="flex items-center gap-4 rounded-xl border-2 border-border bg-white p-5 transition-all hover:border-quartier-green hover:shadow-md active:scale-[0.98]"
              data-testid="type-invitation"
            >
              <span className="text-4xl">🍽️</span>
              <div className="text-left">
                <span className="text-lg font-semibold text-anthrazit">Zum Essen einladen</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Geplant und gesellig — gemeinsam am Tisch
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Schritt 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Was gibt es? *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mealType === "portion" ? "z.B. Lasagne, 3 Portionen" : "z.B. Grillabend im Garten"}
              required
              maxLength={100}
              data-testid="input-title"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium">
              Beschreibung (optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={mealType === "portion"
                ? "z.B. Vegetarisch, enthält Nüsse"
                : "z.B. Jeder bringt etwas mit, Getränke sind da"
              }
              rows={3}
              maxLength={500}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="servings" className="mb-1 block text-sm font-medium">
                {mealType === "portion" ? "Portionen *" : "Plätze *"}
              </label>
              <Input
                id="servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
                max="50"
                required
                data-testid="input-servings"
              />
            </div>
            <div>
              <label htmlFor="meal-date" className="mb-1 block text-sm font-medium">
                Datum *
              </label>
              <Input
                id="meal-date"
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                min={today}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="meal-time" className="mb-1 block text-sm font-medium">
                {mealType === "portion" ? "Ab wann abholen?" : "Uhrzeit"}
              </label>
              <Input
                id="meal-time"
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cost-hint" className="mb-1 block text-sm font-medium">
                Unkostenbeitrag
              </label>
              <Input
                id="cost-hint"
                value={costHint}
                onChange={(e) => setCostHint(e.target.value)}
                placeholder="z.B. 3 EUR"
                maxLength={50}
              />
            </div>
          </div>

          {mealType === "portion" && (
            <div>
              <label htmlFor="pickup-info" className="mb-1 block text-sm font-medium">
                Abholinfo
              </label>
              <Input
                id="pickup-info"
                value={pickupInfo}
                onChange={(e) => setPickupInfo(e.target.value)}
                placeholder="z.B. Klingeln bei Müller, 2. OG"
                maxLength={200}
              />
            </div>
          )}

          {/* Foto-Upload */}
          <div>
            <label className="mb-1 block text-sm font-medium">Foto (optional)</label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Vorschau"
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                  aria-label="Bild entfernen"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-quartier-green transition-colors"
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Zurück
            </Button>
            <Button
              onClick={handleDetailsNext}
              disabled={!title.trim() || !mealDate || !servings}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
              data-testid="next-button"
            >
              Weiter
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 3: Vorschau */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Bitte prüfen Sie Ihre Angaben:</p>

          <div className="rounded-xl border-2 border-border bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{mealType === "portion" ? "🍲" : "🍽️"}</span>
              <span className="text-sm font-medium text-muted-foreground">
                {mealType === "portion" ? "Portionen abgeben" : "Einladung"}
              </span>
            </div>

            {imagePreview && (
              <img
                src={imagePreview}
                alt="Vorschau"
                className="h-32 w-full rounded-lg object-cover"
              />
            )}

            <h3 className="text-lg font-bold text-anthrazit">{title}</h3>

            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-medium text-anthrazit">
                {mealDate
                  ? new Date(mealDate + "T00:00:00").toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : ""}
              </span>
              {mealTime && (
                <span className="text-muted-foreground">{mealTime} Uhr</span>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {parseInt(servings, 10)} {mealType === "portion" ? "Portionen" : "Plätze"}
            </p>

            {costHint && (
              <p className="text-sm text-quartier-green font-medium">
                Unkostenbeitrag: {costHint}
              </p>
            )}

            {pickupInfo && (
              <p className="text-sm text-muted-foreground">
                Abholung: {pickupInfo}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Zurück
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
              data-testid="submit-button"
            >
              {saving ? "Wird erstellt..." : "Jetzt anbieten"}
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
            {mealType === "portion" ? "Portion angeboten!" : "Einladung erstellt!"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Ihre Nachbarn können sich jetzt anmelden.
          </p>
          <div className="mt-6 space-y-3">
            <Button
              onClick={() => router.push("/mitessen")}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              Zu den Mitess-Plätzen
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Zum Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
