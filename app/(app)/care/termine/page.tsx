// app/(app)/care/termine/page.tsx
// Nachbar.io — Meine Termine (kommende + vergangene)
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Building2, Phone, Video, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

// Typ fuer die API-Antwort von /api/appointments
interface Appointment {
  id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: string | null;
  status: string;
  notes_encrypted: string | null;
  created_at: string;
  doctor_profiles: {
    specialization: string[] | null;
    bio: string | null;
    users: {
      display_name: string;
      avatar_url: string | null;
    } | null;
  } | null;
}

// Typ-Badge Zuordnung
const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Building2; color: string }
> = {
  in_person: {
    label: "Vor Ort",
    icon: Building2,
    color: "bg-blue-100 text-blue-700",
  },
  phone: {
    label: "Telefon",
    icon: Phone,
    color: "bg-amber-100 text-amber-700",
  },
  video: {
    label: "Video",
    icon: Video,
    color: "bg-purple-100 text-purple-700",
  },
};

export default function MeineTerminePage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      }
    >
      <MeineTermineContent />
    </Suspense>
  );
}

function MeineTermineContent() {
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("success") === "true";

  const [tab, setTab] = useState("Kommende");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(
    showSuccess ? "Ihr Termin wurde erfolgreich gebucht." : "",
  );

  // Erfolgsmeldung nach 5 Sekunden ausblenden
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Termine laden
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === "Vergangene" ? "past" : "upcoming";
      const res = await fetch(`/api/appointments?status=${status}`);
      if (res.ok) {
        const data: Appointment[] = await res.json();
        setAppointments(data);
      }
    } catch {
      // Stille Fehlerbehandlung
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Termin absagen
  async function handleCancel(appointmentId: string) {
    setCancellingId(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccessMsg("Termin wurde abgesagt.");
        setConfirmCancelId(null);
        // Liste neu laden
        await loadAppointments();
      }
    } catch {
      // Stille Fehlerbehandlung
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      {/* Header */}
      <PageHeader
        title={
          <>
            <Calendar className="h-6 w-6 text-quartier-green" /> Meine Termine
          </>
        }
        backHref="/care"
        backLabel="Zurueck zur Pflege"
      />

      {/* Erfolgsmeldung */}
      {successMsg && (
        <div className="rounded-xl bg-[#4CAF87]/10 p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[#4CAF87]">{successMsg}</p>
          <button
            onClick={() => setSuccessMsg("")}
            className="p-1 rounded hover:bg-[#4CAF87]/10"
            aria-label="Meldung schliessen"
          >
            <X className="h-4 w-4 text-[#4CAF87]" />
          </button>
        </div>
      )}

      {/* Tab-Umschalter */}
      <SegmentedControl
        items={["Kommende", "Vergangene"]}
        active={tab}
        onChange={setTab}
      />

      {/* Lade-Zustand */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Termin-Karten */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const typeConf = TYPE_CONFIG[appt.type ?? ""] ?? {
              label: appt.type ?? "Termin",
              icon: Calendar,
              color: "bg-gray-100 text-gray-700",
            };
            const TypeIcon = typeConf.icon;
            const doctorName =
              appt.doctor_profiles?.users?.display_name ?? "Arzt";
            const dateStr = new Date(appt.scheduled_at).toLocaleDateString(
              "de-DE",
              {
                weekday: "short",
                day: "numeric",
                month: "long",
              },
            );
            const timeStr = new Date(appt.scheduled_at).toLocaleTimeString(
              "de-DE",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            );

            return (
              <div
                key={appt.id}
                className="rounded-xl border bg-white p-4 space-y-3"
              >
                {/* Datum + Uhrzeit */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#2D3142]">
                      {dateStr}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {timeStr} Uhr
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${typeConf.color}`}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {typeConf.label}
                  </span>
                </div>

                {/* Arzt-Name */}
                <p className="text-sm text-[#2D3142]">{doctorName}</p>

                {/* Absagen-Button (nur bei kommenden Terminen) */}
                {tab === "Kommende" && (
                  <>
                    {confirmCancelId === appt.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={cancellingId === appt.id}
                          className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {cancellingId === appt.id
                            ? "Wird abgesagt..."
                            : "Ja, absagen"}
                        </button>
                        <button
                          onClick={() => setConfirmCancelId(null)}
                          className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCancelId(appt.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Absagen
                      </button>
                    )}
                  </>
                )}

                {/* Status-Badge bei vergangenen Terminen */}
                {tab === "Vergangene" && (
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      appt.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : appt.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {appt.status === "completed"
                      ? "Abgeschlossen"
                      : appt.status === "cancelled"
                        ? "Abgesagt"
                        : appt.status === "no_show"
                          ? "Nicht erschienen"
                          : appt.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leerer Zustand */}
      {!loading && appointments.length === 0 && (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-lg font-medium text-[#2D3142]">
            {tab === "Kommende"
              ? "Keine kommenden Termine"
              : "Keine vergangenen Termine"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "Kommende"
              ? "Buchen Sie einen Termin ueber die Aerzte-Seite."
              : "Hier erscheinen Ihre abgeschlossenen Termine."}
          </p>
        </div>
      )}
    </div>
  );
}
