"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { EVENT_CATEGORIES } from "@/lib/constants";

type Step = 1 | 2 | 3 | 4;

export default function NewEventPage() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [saving, setSaving] = useState(false);

  // Mindestdatum: heute
  const today = new Date().toISOString().split("T")[0];

  function handleCategorySelect(catId: string) {
    setCategory(catId);
    const cat = EVENT_CATEGORIES.find((c) => c.id === catId);
    if (cat && !title) {
      setTitle(cat.label);
    }
    setStep(2);
  }

  function handleDetailsNext() {
    if (!title.trim() || !eventDate) return;
    setStep(3);
  }

  async function handleSubmit() {
    if (!category || !title.trim() || !eventDate) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Bitte melden Sie sich erneut an.");
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from("events").insert({
        user_id: user.id,
        quarter_id: currentQuarter?.id,
        category,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        event_date: eventDate,
        event_time: eventTime || null,
        end_time: endTime || null,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      });

      if (insertError) {
        console.error("Event-Erstellung Fehler:", insertError);
        toast.error(`Fehler: ${insertError.message}`);
        setSaving(false);
        return;
      }

      toast.success("Veranstaltung erfolgreich erstellt!");
      setStep(4);
    } catch (err) {
      console.error("Netzwerkfehler:", err);
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setSaving(false);
    }
  }

  // Gewaehlte Kategorie fuer Anzeige
  const selectedCat = EVENT_CATEGORIES.find((c) => c.id === category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/events" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">
          {step === 1 && "Kategorie waehlen"}
          {step === 2 && "Details angeben"}
          {step === 3 && "Zusammenfassung"}
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

      {/* Schritt 1: Kategorie waehlen */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Um was fuer eine Veranstaltung handelt es sich?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-white p-4 transition-all hover:border-quartier-green hover:shadow-md active:scale-95"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-sm font-medium text-anthrazit text-center">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schritt 2: Details eingeben */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Titel *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Nachbarschaftsgrillen im Garten"
              required
              maxLength={100}
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
              placeholder="Was erwartet die Teilnehmer? Sollen sie etwas mitbringen?"
              rows={3}
              maxLength={500}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium">
              Ort (optional)
            </label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Spielplatz Sanarystrasse"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-date" className="mb-1 block text-sm font-medium">
                Datum *
              </label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={today}
                required
              />
            </div>
            <div>
              <label htmlFor="event-time" className="mb-1 block text-sm font-medium">
                Uhrzeit (optional)
              </label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="end-time" className="mb-1 block text-sm font-medium">
                Ende (optional)
              </label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="max-participants" className="mb-1 block text-sm font-medium">
                Max. Teilnehmer
              </label>
              <Input
                id="max-participants"
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="unbegrenzt"
                min="2"
                max="200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Zurueck
            </Button>
            <Button
              onClick={handleDetailsNext}
              disabled={!title.trim() || !eventDate}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
            >
              Weiter
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 3: Zusammenfassung */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">Bitte pruefen Sie Ihre Angaben:</p>

          <div className="rounded-xl border-2 border-border bg-white p-5 space-y-3">
            {/* Kategorie */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedCat?.icon}</span>
              <span className="text-sm font-medium text-muted-foreground">
                {selectedCat?.label}
              </span>
            </div>

            {/* Titel */}
            <h3 className="text-lg font-bold text-anthrazit">{title}</h3>

            {/* Beschreibung */}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {/* Datum & Uhrzeit */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-medium text-anthrazit">
                {eventDate
                  ? new Date(eventDate + "T00:00:00").toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </span>
              {eventTime && (
                <span className="text-muted-foreground">
                  {eventTime} Uhr{endTime ? ` - ${endTime} Uhr` : ""}
                </span>
              )}
            </div>

            {/* Ort */}
            {location && (
              <p className="text-sm text-muted-foreground">
                Ort: {location}
              </p>
            )}

            {/* Max. Teilnehmer */}
            {maxParticipants && (
              <p className="text-sm text-muted-foreground">
                Max. {maxParticipants} Teilnehmer
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Zurueck
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
            >
              {saving ? "Wird erstellt..." : "Veranstaltung erstellen"}
            </Button>
          </div>
        </div>
      )}

      {/* Schritt 4: Erfolgsmeldung */}
      {step === 4 && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10">
            <Check className="h-8 w-8 text-quartier-green" />
          </div>
          <h2 className="text-lg font-bold text-anthrazit">Veranstaltung erstellt!</h2>
          <p className="mt-2 text-muted-foreground">
            Ihre Veranstaltung ist jetzt fuer alle Nachbarn im Quartier sichtbar.
          </p>
          <div className="mt-6 space-y-3">
            <Button
              onClick={() => router.push("/events")}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              Zu den Veranstaltungen
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
