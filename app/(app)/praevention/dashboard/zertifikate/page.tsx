"use client";

// /praevention/dashboard/zertifikate — Bescheinigungen freigeben
// Teilnehmer-Liste mit Anwesenheit, Freigabe nur bei >=80%

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Check, X, Download } from "lucide-react";

interface Participant {
  enrollmentId: string;
  displayName: string;
  attendanceRate: number;
  completedAt: string | null;
  certificateGenerated: boolean;
  certificateId: string | null;
  prePss10: number | null;
  postPss10: number | null;
}

export default function ZertifikatePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prevention/dashboard/participants");
        if (!res.ok) return;
        const data = await res.json();

        if (Array.isArray(data)) {
          const mapped = data.map((p: Record<string, unknown>) => ({
            enrollmentId: p.enrollment_id as string,
            displayName: (p.display_name as string) || "Unbekannt",
            attendanceRate: (p.attendance_rate as number) ?? 0,
            completedAt: (p.completed_at as string) ?? null,
            certificateGenerated: (p.certificate_generated as boolean) ?? false,
            certificateId: (p.certificate_id as string) ?? null,
            prePss10: (p.pre_pss10_score as number) ?? null,
            postPss10: (p.post_pss10_score as number) ?? null,
          }));
          setParticipants(mapped);
        }
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Zertifikat freigeben
  const issueCertificate = async (enrollmentId: string) => {
    setIssuingId(enrollmentId);
    try {
      const res = await fetch("/api/prevention/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      });

      if (res.ok) {
        const data = await res.json();
        setParticipants((prev) =>
          prev.map((p) =>
            p.enrollmentId === enrollmentId
              ? {
                  ...p,
                  certificateGenerated: true,
                  certificateId: data.certificateId,
                }
              : p,
          ),
        );
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setIssuingId(null);
    }
  };

  const eligible = participants.filter((p) => p.attendanceRate >= 80);
  const notEligible = participants.filter((p) => p.attendanceRate < 80);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/dashboard"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            Teilnahmebescheinigungen
          </h1>
          <p className="text-xs text-gray-500">
            Freigabe bei mindestens 80% Anwesenheit
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          Wird geladen...
        </div>
      ) : (
        <>
          {/* Berechtigte Teilnehmer */}
          {eligible.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" />
                Berechtigt ({eligible.length})
              </h2>
              <div className="space-y-3">
                {eligible.map((p) => (
                  <div
                    key={p.enrollmentId}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {p.displayName}
                      </p>
                      <p className="text-xs text-gray-600">
                        Anwesenheit: {p.attendanceRate.toFixed(0)}%
                        {p.prePss10 !== null &&
                          p.postPss10 !== null &&
                          ` · PSS-10: ${p.prePss10} → ${p.postPss10}`}
                      </p>
                    </div>
                    {p.certificateGenerated ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600">
                          Ausgestellt
                        </span>
                        <Award className="h-5 w-5 text-emerald-600" />
                      </div>
                    ) : (
                      <button
                        onClick={() => issueCertificate(p.enrollmentId)}
                        disabled={issuingId === p.enrollmentId}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:bg-gray-300"
                      >
                        <Award className="h-4 w-4" />
                        {issuingId === p.enrollmentId ? "..." : "Freigeben"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nicht berechtigte Teilnehmer */}
          {notEligible.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500">
                <X className="h-4 w-4" />
                Noch nicht berechtigt ({notEligible.length})
              </h2>
              <div className="space-y-3">
                {notEligible.map((p) => (
                  <div
                    key={p.enrollmentId}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {p.displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Anwesenheit: {p.attendanceRate.toFixed(0)}% (mind. 80%
                        erforderlich)
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">Ausstehend</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {participants.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
              <Award className="h-8 w-8" />
              <p>Noch keine Teilnehmer</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
