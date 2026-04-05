"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, FileText } from "lucide-react";
import Link from "next/link";

export default function BescheinigungPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <BescheinigungContent />
    </Suspense>
  );
}

function BescheinigungContent() {
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get("enrollment") || "";

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/erstattung"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bescheinigung</h1>
          <p className="text-sm text-gray-500">Schritt 2 von 4</p>
        </div>
      </div>

      {/* Erklaerung */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <h3 className="mb-1 text-sm font-semibold text-emerald-800">
          Teilnahmebescheinigung herunterladen
        </h3>
        <p className="text-sm text-emerald-700">
          Ihre Krankenkasse benötigt die Teilnahmebescheinigung als Nachweis.
          Laden Sie das PDF herunter und halten Sie es bereit.
        </p>
      </div>

      {/* PDF-Vorschau */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <FileText className="mx-auto mb-3 h-16 w-16 text-emerald-500" />
        <h3 className="mb-1 font-semibold text-gray-900">
          Teilnahmebescheinigung
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          &quot;Aktiv im Quartier&quot; — Stressbewältigung nach § 20 SGB V
        </p>

        <a
          href={`/api/prevention/certificate?enrollmentId=${enrollmentId}&format=pdf`}
          download
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700"
          style={{ minHeight: "48px" }}
        >
          <Download className="h-5 w-5" />
          PDF herunterladen
        </a>
      </div>

      {/* Hinweise */}
      <div className="mb-6 space-y-2">
        <p className="text-sm text-gray-600">
          <strong>Tipp:</strong> Speichern Sie die Bescheinigung auf Ihrem
          Gerät. Einige Kassen akzeptieren auch Fotos der Bescheinigung.
        </p>
      </div>

      {/* Weiter */}
      <Link
        href={`/praevention/erstattung/einreichen?enrollment=${enrollmentId}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700"
        style={{ minHeight: "48px" }}
      >
        Weiter zum Einreichen
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
