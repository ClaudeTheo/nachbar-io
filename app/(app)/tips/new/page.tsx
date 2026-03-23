"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TIP_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuarter } from "@/lib/quarters";

type Step = "category" | "details" | "done";

// Rate-Limit: max 3 Tipps pro Tag
const MAX_TIPS_PER_DAY = 3;

export default function NewTipPage() {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [contactHint, setContactHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { currentQuarter } = useQuarter();

  function handleCategorySelect(catId: string) {
    setCategory(catId);
    setStep("details");
  }

  async function handleSubmit() {
    if (!category || !title.trim() || !description.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setError("Bitte melden Sie sich erneut an.");
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Rate-Limit prüfen: max 3 Tipps pro Tag
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error: countError } = await supabase
        .from("community_tips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());

      if (!countError && count !== null && count >= MAX_TIPS_PER_DAY) {
        setError(`Sie haben heute bereits ${MAX_TIPS_PER_DAY} Tipps geteilt. Versuchen Sie es morgen erneut.`);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("community_tips").insert({
        user_id: user.id,
        quarter_id: currentQuarter?.id,
        category,
        title: title.trim(),
        business_name: businessName.trim() || null,
        description: description.trim(),
        location_hint: locationHint.trim() || null,
        contact_hint: contactHint.trim() || null,
      });

      if (insertError) {
        console.error("Tipp-Erstellung Fehler:", insertError);
        toast.error(`Fehler: ${insertError.message}`);
        setError(`Fehler: ${insertError.message}`);
        setLoading(false);
        return;
      }

      toast.success("Tipp veröffentlicht! Danke für Ihre Empfehlung.");
      setStep("done");
      setLoading(false);
    } catch (err) {
      console.error("Netzwerkfehler:", err);
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/tips" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {step === "category" && "Tipp teilen"}
          {step === "details" && "Details zum Tipp"}
          {step === "done" && "Veröffentlicht!"}
        </h1>
      </div>

      {/* Fortschrittsbalken */}
      {step !== "done" && (
        <div className="mb-4">
          <div className="flex gap-1">
            <div className={`h-1.5 flex-1 rounded-full ${step === "category" || step === "details" ? "bg-quartier-green" : "bg-muted"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step === "details" ? "bg-quartier-green" : "bg-muted"}`} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Schritt {step === "category" ? 1 : 2} von 2
          </p>
        </div>
      )}

      {/* Schritt 1: Kategorie */}
      {step === "category" && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            In welchem Bereich möchten Sie eine Empfehlung teilen?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TIP_CATEGORIES.map((cat) => (
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
        </div>
      )}

      {/* Schritt 2: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Titel der Empfehlung *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Super Elektriker für Altbausanierung"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="business" className="mb-1 block text-sm font-medium">
              Name des Betriebs / der Person (optional)
            </label>
            <Input
              id="business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="z.B. Elektro Müller GmbH"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="desc" className="mb-1 block text-sm font-medium">
              Beschreibung *
            </label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was war gut? Warum empfehlen Sie es?"
              rows={4}
              required
              maxLength={1000}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/1000
            </p>
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium">
              Ort / Adresse (optional)
            </label>
            <Input
              id="location"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="z.B. Hauptstraße 12"
              maxLength={200}
            />
          </div>

          <div>
            <label htmlFor="contact" className="mb-1 block text-sm font-medium">
              Kontakt-Hinweis (optional)
            </label>
            <Input
              id="contact"
              value={contactHint}
              onChange={(e) => setContactHint(e.target.value)}
              placeholder="z.B. Tel: 07761-1234 oder www.beispiel.de"
              maxLength={200}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Bitte teilen Sie nur öffentlich verfügbare Kontaktdaten.
            </p>
          </div>

          {error && <p className="text-sm text-emergency-red">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !description.trim()}
            className="w-full bg-quartier-green py-6 text-lg font-bold hover:bg-quartier-green-dark"
          >
            {loading ? "Wird veröffentlicht..." : "Tipp veröffentlichen"}
          </Button>

          <button
            onClick={() => setStep("category")}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Zurück
          </button>
        </div>
      )}

      {/* Bestätigung */}
      {step === "done" && (
        <div className="space-y-6 text-center">
          <div className="text-5xl">💡</div>
          <h2 className="text-xl font-bold text-anthrazit">Tipp veröffentlicht!</h2>
          <p className="text-muted-foreground">
            Vielen Dank für Ihre Empfehlung. Ihre Nachbarn können den Tipp jetzt sehen und bestätigen.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/tips")}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              Alle Tipps anzeigen
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
