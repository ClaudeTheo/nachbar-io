// app/(app)/care/termine/page.tsx
// Nachbar.io — Care-Termine (kommende + vergangene)
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Calendar,
  Heart,
  MapPin,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { CareAppointment, CareAppointmentType } from "@/lib/care/types";

const TYPE_CONFIG: Partial<
  Record<
    CareAppointmentType,
    {
      label: string;
      icon: typeof Calendar;
      color: string;
    }
  >
> = {
  doctor: {
    label: "Arzttermin",
    icon: Stethoscope,
    color: "bg-blue-100 text-blue-700",
  },
  care_service: {
    label: "Pflegedienst",
    icon: Heart,
    color: "bg-rose-100 text-rose-700",
  },
  therapy: {
    label: "Therapie",
    icon: Activity,
    color: "bg-emerald-100 text-emerald-700",
  },
  shopping: {
    label: "Einkauf",
    icon: MapPin,
    color: "bg-amber-100 text-amber-700",
  },
  quarter_meeting: {
    label: "Quartier-Termin",
    icon: Calendar,
    color: "bg-violet-100 text-violet-700",
  },
  personal: {
    label: "Persoenlicher Termin",
    icon: Calendar,
    color: "bg-slate-100 text-slate-700",
  },
  birthday: {
    label: "Geburtstag",
    icon: Calendar,
    color: "bg-pink-100 text-pink-700",
  },
  waste_collection: {
    label: "Abholung",
    icon: Calendar,
    color: "bg-lime-100 text-lime-700",
  },
  other: {
    label: "Termin",
    icon: Calendar,
    color: "bg-gray-100 text-gray-700",
  },
};

function isPastAppointment(appointment: CareAppointment) {
  return new Date(appointment.scheduled_at).getTime() < Date.now();
}

export default function MeineTerminePage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <div className="h-8 rounded bg-gray-200 animate-pulse" />
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
  const [appointments, setAppointments] = useState<CareAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(
    showSuccess ? "Ihr Termin wurde erfolgreich gespeichert." : "",
  );

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(""), 5000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const showUpcoming = tab === "Kommende";
      const res = await fetch(`/api/care/appointments?upcoming=${showUpcoming}`);
      if (!res.ok) {
        throw new Error("LOAD_FAILED");
      }

      const data: CareAppointment[] = await res.json();
      const normalizedAppointments = showUpcoming
        ? data
        : data
            .filter(isPastAppointment)
            .sort(
              (a, b) =>
                new Date(b.scheduled_at).getTime() -
                new Date(a.scheduled_at).getTime(),
            );

      setAppointments(normalizedAppointments);
    } catch {
      setAppointments([]);
      setErrorMsg("Termine konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function handleDelete(appointmentId: string) {
    setDeletingId(appointmentId);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/care/appointments/${appointmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("DELETE_FAILED");
      }

      setSuccessMsg("Termin wurde entfernt.");
      setConfirmDeleteId(null);
      await loadAppointments();
    } catch {
      setErrorMsg("Termin konnte nicht entfernt werden.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="px-4 py-6 space-y-5 pb-24">
      <PageHeader
        title={
          <>
            <Calendar className="h-6 w-6 text-quartier-green" /> Meine Termine
          </>
        }
        backHref="/care"
        backLabel="Zurueck zur Pflege"
      />

      {successMsg && (
        <div className="rounded-xl bg-[#4CAF87]/10 p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[#4CAF87]">{successMsg}</p>
          <button
            onClick={() => setSuccessMsg("")}
            className="rounded p-1 hover:bg-[#4CAF87]/10"
            aria-label="Meldung schliessen"
          >
            <X className="h-4 w-4 text-[#4CAF87]" />
          </button>
        </div>
      )}

      <SegmentedControl
        items={["Kommende", "Vergangene"]}
        active={tab}
        onChange={setTab}
      />

      {errorMsg && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !errorMsg && appointments.length > 0 && (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const typeConf =
              TYPE_CONFIG[appointment.type ?? "other"] ?? TYPE_CONFIG.other!;
            const TypeIcon = typeConf.icon;
            const dateStr = new Date(
              appointment.scheduled_at,
            ).toLocaleDateString("de-DE", {
              weekday: "short",
              day: "numeric",
              month: "long",
            });
            const timeStr = new Date(
              appointment.scheduled_at,
            ).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={appointment.id}
                className="rounded-xl border bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[#2D3142]">
                      {appointment.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dateStr} · {timeStr} Uhr
                      {appointment.duration_minutes
                        ? ` · ${appointment.duration_minutes} Min.`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${typeConf.color}`}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {typeConf.label}
                  </span>
                </div>

                {appointment.location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{appointment.location}</span>
                  </div>
                )}

                {appointment.notes && (
                  <p className="border-t pt-2 text-sm text-muted-foreground">
                    {appointment.notes}
                  </p>
                )}

                {tab === "Kommende" && (
                  <>
                    {confirmDeleteId === appointment.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          disabled={deletingId === appointment.id}
                          className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === appointment.id
                            ? "Wird entfernt..."
                            : "Ja, entfernen"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(appointment.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Entfernen
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !errorMsg && appointments.length === 0 && (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-lg font-medium text-[#2D3142]">
            {tab === "Kommende"
              ? "Keine kommenden Termine"
              : "Keine vergangenen Termine"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "Kommende"
              ? "Neue Termine erscheinen hier, sobald sie fuer Sie angelegt wurden."
              : "Vergangene Termine bleiben hier zur Uebersicht sichtbar."}
          </p>
        </div>
      )}
    </div>
  );
}
