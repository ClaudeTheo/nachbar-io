"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HELP_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

type Step = "type" | "category" | "details" | "done";

export default function NewHelpPage() {
  const [step, setStep] = useState<Step>("type");
  const [helpType, setHelpType] = useState<"need" | "offer" | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleTypeSelect(type: "need" | "offer") {
    setHelpType(type);
    setStep("category");
  }

  function handleCategorySelect(catId: string) {
    setCategory(catId);
    const cat = HELP_CATEGORIES.find((c) => c.id === catId);
    // Titel automatisch vorbelegen
    if (cat) {
      setTitle(helpType === "need" ? `Suche ${cat.label}` : `Biete ${cat.label}`);
    }
    setStep("details");
  }

  async function handleSubmit() {
    if (!helpType || !category || !title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Bitte melden Sie sich erneut an.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("help_requests").insert({
        user_id: user.id,
        type: helpType,
        category,
        title: title.trim(),
        description: description.trim() || null,
        status: "active",
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
          {step === "details" && "Details"}
          {step === "done" && "Veröffentlicht!"}
        </h1>
      </div>

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
      )}

      {/* Schritt 3: Details */}
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
            onClick={() => setStep("category")}
            className="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Zurück
          </button>
        </div>
      )}

      {/* Schritt 4: Bestätigung */}
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
