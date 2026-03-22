"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HELP_CATEGORIES, HELP_SUBCATEGORIES, HELP_EXPIRY_DAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuarter } from "@/lib/quarters";

type Step = "type" | "category" | "subcategory" | "details" | "done";

export default function NewHelpPage() {
  const [step, setStep] = useState<Step>("type");
  const [helpType, setHelpType] = useState<"need" | "offer" | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { currentQuarter } = useQuarter();

  // Prüfen ob gewählte Kategorie Unterkategorien hat
  const subcategories = category ? HELP_SUBCATEGORIES[category] ?? [] : [];
  const hasSubcategories = subcategories.length > 0;

  function handleTypeSelect(type: "need" | "offer") {
    setHelpType(type);
    setStep("category");
  }

  function handleCategorySelect(catId: string) {
    setCategory(catId);
    setSubcategory(null);
    const subs = HELP_SUBCATEGORIES[catId];
    if (subs && subs.length > 0) {
      // Kategorie hat Unterkategorien → Zwischen-Schritt
      setStep("subcategory");
    } else {
      // Keine Unterkategorien → direkt zu Details
      const cat = HELP_CATEGORIES.find((c) => c.id === catId);
      if (cat) {
        setTitle(helpType === "need" ? `Suche ${cat.label}` : `Biete ${cat.label}`);
      }
      setStep("details");
    }
  }

  function handleSubcategorySelect(subId: string | null) {
    setSubcategory(subId);
    const cat = HELP_CATEGORIES.find((c) => c.id === category);
    const sub = subId ? subcategories.find((s) => s.id === subId) : null;

    // Titel mit Unterkategorie vorbelegen
    if (sub) {
      setTitle(helpType === "need" ? `Suche: ${sub.label}` : `Biete: ${sub.label}`);
    } else if (cat) {
      setTitle(helpType === "need" ? `Suche ${cat.label}` : `Biete ${cat.label}`);
    }
    setStep("details");
  }

  async function handleSubmit() {
    if (!helpType || !category || !title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setError("Bitte melden Sie sich erneut an.");
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Auto-Expire basierend auf Kategorie-Dringlichkeit
      const expiryDays = HELP_EXPIRY_DAYS[category] ?? 3;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from("help_requests").insert({
        user_id: user.id,
        quarter_id: currentQuarter?.id,
        type: helpType,
        category,
        subcategory: subcategory || null,
        title: title.trim(),
        description: description.trim() || null,
        status: "active",
        expires_at: expiresAt,
      });

      if (insertError) {
        console.error("Hilfe-Eintrag Fehler:", insertError);
        toast.error(`Fehler: ${insertError.message}`);
        setError(`Fehler: ${insertError.message}`);
        setLoading(false);
        return;
      }

      toast.success(helpType === "need" ? "Hilfegesuch veröffentlicht!" : "Hilfsangebot veröffentlicht!");
      setStep("done");
      setLoading(false);
    } catch (err) {
      console.error("Netzwerkfehler:", err);
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }

  // Fortschritts-Berechnung
  const totalSteps = hasSubcategories || step === "subcategory" ? 5 : 4;
  const stepIndex = { type: 1, category: 2, subcategory: 3, details: hasSubcategories ? 4 : 3, done: totalSteps }[step];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/help" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {step === "type" && "Was möchten Sie?"}
          {step === "category" && (helpType === "need" ? "Was brauchen Sie?" : "Was können Sie anbieten?")}
          {step === "subcategory" && "Genauer gesagt..."}
          {step === "details" && "Details"}
          {step === "done" && "Veröffentlicht!"}
        </h1>
      </div>

      {/* Fortschrittsbalken */}
      {step !== "done" && (
        <div className="mb-4">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < stepIndex ? "bg-quartier-green" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Schritt {stepIndex} von {totalSteps}
          </p>
        </div>
      )}

      {/* Schritt 1: Typ wählen */}
      {step === "type" && (
        <div className="space-y-4">
          <button
            onClick={() => handleTypeSelect("need")}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-white p-5 text-left transition-all hover:border-quartier-green hover:shadow-md active:scale-[0.98]"
          >
            <span className="text-4xl">🔍</span>
            <div>
              <p className="text-lg font-bold text-anthrazit">Hilfe suchen</p>
              <p className="text-sm text-muted-foreground">
                Sie brauchen Hilfe bei etwas? Ihre Nachbarn können helfen.
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect("offer")}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-white p-5 text-left transition-all hover:border-quartier-green hover:shadow-md active:scale-[0.98]"
          >
            <span className="text-4xl">🤝</span>
            <div>
              <p className="text-lg font-bold text-anthrazit">Hilfe anbieten</p>
              <p className="text-sm text-muted-foreground">
                Sie können Ihren Nachbarn helfen? Lassen Sie es sie wissen.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Schritt 2: Kategorie wählen */}
      {step === "category" && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {HELP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-white p-4 transition-all hover:border-quartier-green hover:shadow-md active:scale-95"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-medium text-anthrazit">{cat.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("type")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Zurück
          </button>
        </div>
      )}

      {/* Schritt 2.5: Unterkategorie wählen (optional) */}
      {step === "subcategory" && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Wählen Sie eine genauere Beschreibung — oder überspringen Sie diesen Schritt.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubcategorySelect(sub.id)}
                className="rounded-xl border-2 border-border bg-white p-4 text-center transition-all hover:border-quartier-green hover:shadow-md active:scale-95"
              >
                <span className="text-sm font-medium text-anthrazit">{sub.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => handleSubcategorySelect(null)}
              className="w-full rounded-xl border-2 border-dashed border-border bg-white p-3 text-center text-sm text-muted-foreground transition-all hover:border-quartier-green hover:shadow-md"
            >
              Überspringen — ohne genauere Angabe
            </button>
            <button
              onClick={() => setStep("category")}
              className="w-full text-center text-sm text-muted-foreground hover:underline"
            >
              Zurück
            </button>
          </div>
        </div>
      )}

      {/* Schritt 3/4: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Titel
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Suche Fahrdienst zum Arzt"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="desc" className="mb-1 block text-sm font-medium">
              Beschreibung (optional)
            </label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weitere Details, Zeitraum, etc."
              rows={3}
              maxLength={500}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="w-full bg-quartier-green py-6 text-lg font-bold hover:bg-quartier-green-dark"
          >
            {loading ? "Wird veröffentlicht..." : "Veröffentlichen"}
          </Button>

          <button
            onClick={() => setStep(hasSubcategories ? "subcategory" : "category")}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Zurück
          </button>
        </div>
      )}

      {/* Letzter Schritt: Bestätigung */}
      {step === "done" && (
        <div className="space-y-6 text-center">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-anthrazit">
            {helpType === "need" ? "Hilfegesuch veröffentlicht" : "Hilfsangebot veröffentlicht"}
          </h2>
          <p className="text-muted-foreground">
            Ihre Nachbarn können jetzt Ihren Eintrag in der Hilfe-Börse sehen.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/help")}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              Zur Hilfe-Börse
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
