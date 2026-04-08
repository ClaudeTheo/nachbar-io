// app/(app)/care/termine/buchen/[doctorId]/page.tsx
// Nachbar.io — Terminbuchung Wizard (3 Schritte, Senior-optimiert)
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, Phone, Video, ArrowLeft, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// Terminart-Optionen
const APPOINTMENT_TYPES = [
  { value: "in_person", label: "Vor Ort", icon: Building2 },
  { value: "phone", label: "Telefon", icon: Phone },
  { value: "video", label: "Video", icon: Video },
] as const;

type AppointmentType = (typeof APPOINTMENT_TYPES)[number]["value"];

// Slot-Typ aus der API
interface Slot {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: string | null;
}

// Arzt-Profil (vereinfacht fuer Zusammenfassung)
interface DoctorInfo {
  user_id: string;
  users: {
    display_name: string;
  } | null;
}

export default function TerminbuchungWizardPage() {
  const params = useParams<{ doctorId: string }>();
  const router = useRouter();
  const doctorId = params.doctorId;

  // Wizard-Zustand
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(
    null,
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Arzt-Name laden (fuer Zusammenfassung)
  useEffect(() => {
    if (!doctorId) return;
    async function loadDoctor() {
      try {
        const res = await fetch(`/api/doctors/${doctorId}`);
        if (res.ok) {
          const data: DoctorInfo = await res.json();
          setDoctorInfo(data);
        }
      } catch {
        // Stille Fehlerbehandlung
      }
    }
    loadDoctor();
  }, [doctorId]);

  // Slots laden wenn Schritt 2 erreicht wird
  useEffect(() => {
    if (step !== 2 || !doctorId) return;
    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/doctors/${doctorId}/slots`);
        if (res.ok) {
          const data: Slot[] = await res.json();
          setSlots(data);
        }
      } catch {
        // Stille Fehlerbehandlung
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [step, doctorId]);

  // Slots nach Datum gruppieren
  function groupSlotsByDate(allSlots: Slot[]): Map<string, Slot[]> {
    const groups = new Map<string, Slot[]>();
    for (const slot of allSlots) {
      const dateKey = new Date(slot.scheduled_at).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const existing = groups.get(dateKey) ?? [];
      existing.push(slot);
      groups.set(dateKey, existing);
    }
    return groups;
  }

  // Termin buchen
  async function handleBook() {
    if (!selectedSlot || !selectedType) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedSlot.id,
          type: selectedType,
        }),
      });

      if (res.ok) {
        // Erfolg — zur Termine-Seite mit Erfolgsmeldung
        router.push("/care/termine?success=true");
      } else {
        const errData = await res.json().catch(() => null);
        setSubmitError(errData?.error ?? "Termin konnte nicht gebucht werden.");
      }
    } catch {
      setSubmitError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  const doctorName = doctorInfo?.users?.display_name ?? "Arzt";
  const typeLabel =
    APPOINTMENT_TYPES.find((t) => t.value === selectedType)?.label ?? "";

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        title="Termin buchen"
        backHref={`/care/aerzte/${doctorId}`}
        backLabel="Zurueck zum Arzt-Profil"
      />

      {/* Schritt-Anzeige */}
      <p className="text-sm font-medium text-muted-foreground">
        Schritt {step} von 3
      </p>

      {/* ============ SCHRITT 1: Terminart ============ */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#2D3142]">
            Welche Art von Termin moechten Sie?
          </h2>
          <div className="space-y-3">
            {APPOINTMENT_TYPES.map((typeOpt) => {
              const Icon = typeOpt.icon;
              return (
                <button
                  key={typeOpt.value}
                  onClick={() => {
                    setSelectedType(typeOpt.value);
                    setStep(2);
                  }}
                  className="flex items-center gap-4 w-full rounded-xl border-2 bg-white p-5 text-left hover:border-[#4CAF87] transition-colors"
                  style={{ minHeight: "80px" }}
                >
                  <Icon className="h-7 w-7 text-[#4CAF87] shrink-0" />
                  <span className="text-lg font-semibold text-[#2D3142]">
                    {typeOpt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ SCHRITT 2: Datum + Uhrzeit ============ */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStep(1);
                setSelectedSlot(null);
              }}
              className="rounded-lg p-1.5 hover:bg-muted"
              aria-label="Zurueck"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-[#2D3142]">
              Datum und Uhrzeit waehlen
            </h2>
          </div>

          {loadingSlots && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}

          {!loadingSlots && slots.length === 0 && (
            <div className="rounded-xl bg-gray-50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Aktuell keine freien Termine verfuegbar.
              </p>
            </div>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className="space-y-5">
              {Array.from(groupSlotsByDate(slots).entries()).map(
                ([dateLabel, dateSlots]) => (
                  <div key={dateLabel}>
                    <h3 className="text-sm font-semibold text-[#2D3142] mb-2">
                      {dateLabel}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dateSlots.map((slot) => {
                        const time = new Date(
                          slot.scheduled_at,
                        ).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-[#4CAF87] text-white"
                                : "bg-gray-100 text-[#2D3142] hover:bg-gray-200"
                            }`}
                            style={{ minHeight: "44px" }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}

              {/* Weiter-Button */}
              <button
                onClick={() => selectedSlot && setStep(3)}
                disabled={!selectedSlot}
                className={`w-full rounded-xl py-4 text-lg font-semibold transition-colors ${
                  selectedSlot
                    ? "bg-[#4CAF87] text-white hover:bg-[#3d9a73]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                style={{ minHeight: "56px" }}
              >
                Weiter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============ SCHRITT 3: Bestaetigung ============ */}
      {step === 3 && selectedSlot && selectedType && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg p-1.5 hover:bg-muted"
              aria-label="Zurueck"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-[#2D3142]">
              Termin bestaetigen
            </h2>
          </div>

          {/* Zusammenfassung */}
          <div className="rounded-xl border bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Arzt</span>
              <span className="text-sm font-semibold text-[#2D3142]">
                {doctorName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Terminart</span>
              <span className="text-sm font-semibold text-[#2D3142]">
                {typeLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Datum</span>
              <span className="text-sm font-semibold text-[#2D3142]">
                {new Date(selectedSlot.scheduled_at).toLocaleDateString(
                  "de-DE",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uhrzeit</span>
              <span className="text-sm font-semibold text-[#2D3142]">
                {new Date(selectedSlot.scheduled_at).toLocaleTimeString(
                  "de-DE",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
            </div>
          </div>

          {/* Fehlermeldung */}
          {submitError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Aktionen */}
          <button
            onClick={handleBook}
            disabled={submitting}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#4CAF87] text-white font-semibold text-lg disabled:opacity-50"
            style={{ minHeight: "80px" }}
          >
            {submitting ? (
              "Wird gebucht..."
            ) : (
              <>
                <Check className="h-5 w-5" />
                Termin buchen
              </>
            )}
          </button>

          <button
            onClick={() => router.push(`/care/aerzte/${doctorId}`)}
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-[#2D3142] py-3"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}
