"use client";

// /praevention/zertifikat — Teilnahmebescheinigung Vorschau + Download
// Zeigt ZPP-konforme Bescheinigung an, Download als Bild/Druck

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Award, Printer } from "lucide-react";

interface CertificateData {
  participantName: string;
  courseTitle: string;
  coursePeriod: string;
  totalSessions: number;
  completedSessions: number;
  attendanceRate: number;
  instructorName: string;
  instructorQualification: string;
  certificateId: string;
  issuedAt: string;
  zppId: string;
}

export default function ZertifikatPage() {
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Eigene Enrollment finden
        const progRes = await fetch("/api/prevention/progress");
        if (!progRes.ok) {
          setError("Kein Kurs gefunden");
          return;
        }
        const progress = await progRes.json();

        const certRes = await fetch(
          `/api/prevention/certificate?enrollmentId=${progress.enrollment.id}`,
        );
        if (!certRes.ok) {
          const data = await certRes.json();
          setError(data.error || "Bescheinigung nicht verfügbar");
          return;
        }
        setCert(await certRes.json());
      } catch {
        setError("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <Award className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="mb-4 text-gray-600">{error || "Keine Bescheinigung"}</p>
        <Link href="/praevention" className="text-emerald-600 underline">
          Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header (nicht druckbar) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/praevention"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">
            Ihre Bescheinigung
          </h1>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
        >
          <Printer className="h-4 w-4" />
          Drucken / PDF
        </button>
      </div>

      {/* Zertifikat (druckbar) */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-white p-8 shadow-lg print:border print:shadow-none">
        {/* Logo + Titel */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Award className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Teilnahmebescheinigung
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Praeventionskurs nach § 20 SGB V
          </p>
        </div>

        {/* Inhalt */}
        <div className="mb-8 space-y-4 text-center">
          <p className="text-gray-600">Hiermit wird bestätigt, dass</p>
          <p className="text-xl font-semibold text-gray-900">
            {cert.participantName}
          </p>
          <p className="text-gray-600">am Präventionskurs</p>
          <p className="text-lg font-semibold text-emerald-700">
            {cert.courseTitle}
          </p>
          <p className="text-gray-600">im Zeitraum {cert.coursePeriod}</p>
          <p className="text-gray-600">erfolgreich teilgenommen hat.</p>
        </div>

        {/* Details */}
        <div className="mb-8 rounded-xl bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Teilnahmequote</p>
              <p className="font-semibold text-gray-800">
                {cert.attendanceRate}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Absolvierte Einheiten</p>
              <p className="font-semibold text-gray-800">
                {cert.completedSessions}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Kursleitung</p>
              <p className="font-semibold text-gray-800">
                {cert.instructorName}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Qualifikation</p>
              <p className="font-semibold text-gray-800">
                {cert.instructorQualification}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          <p>Zertifikat-ID: {cert.certificateId}</p>
          <p>Ausgestellt am: {cert.issuedAt}</p>
          <p className="mt-2">
            Anbieter: nachbar.io — Digitale Quartiersentwicklung
          </p>
        </div>
      </div>

      {/* Erstattungs-Hinweis */}
      <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center print:hidden">
        <p className="text-sm text-emerald-800">
          Reichen Sie diese Bescheinigung bei Ihrer Krankenkasse ein, um bis zu
          120 € erstattet zu bekommen.
        </p>
        <Link
          href="/praevention/erstattung"
          className="mt-2 inline-block text-sm font-medium text-emerald-600 underline"
        >
          Erstattung beantragen →
        </Link>
      </div>
    </div>
  );
}
