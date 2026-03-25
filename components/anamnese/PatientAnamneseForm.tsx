"use client";

// Nachbar.io — Patienten-Anamnese-Formular
// Laedt Felder per Token, rendert dynamisch, verschickt verschluesselt
// Senior-Modus: Grosse Buttons, klare Kontraste, Pagination bei vielen Feldern

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AnamneseFormField from "./AnamneseFormField";

interface AnamnesisField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface FormData {
  form_id: string;
  template_name: string;
  template_description: string | null;
  fields: AnamnesisField[];
}

const FIELDS_PER_PAGE = 5;

export default function PatientAnamneseForm({ token }: { token: string }) {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [answers, setAnswers] = useState<
    Record<string, string | string[] | number | boolean | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [currentPage, setCurrentPage] = useState(0);

  // Formular laden
  useEffect(() => {
    fetch(`/api/anamnese/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Bogen konnte nicht geladen werden.");
          return;
        }
        const data = await res.json();
        setFormData(data);

        // Default-Werte setzen
        const defaults: Record<
          string,
          string | string[] | number | boolean | null
        > = {};
        for (const field of data.fields) {
          if (field.type === "boolean") defaults[field.id] = null;
          else if (field.type === "multiselect") defaults[field.id] = [];
          else if (field.type === "number" || field.type === "scale")
            defaults[field.id] = field.min ?? 0;
          else defaults[field.id] = "";
        }
        setAnswers(defaults);
      })
      .catch(() =>
        setError("Netzwerkfehler. Bitte pruefen Sie Ihre Internetverbindung."),
      )
      .finally(() => setLoading(false));
  }, [token]);

  // Antwort aktualisieren
  const updateAnswer = (
    fieldId: string,
    value: string | string[] | number | boolean | null,
  ) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    // Validierungsfehler loeschen
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Validierung
  const validate = (): boolean => {
    if (!formData) return false;
    const errors: Record<string, string> = {};

    for (const field of formData.fields) {
      if (!field.required) continue;
      const value = answers[field.id];

      if (value === null || value === undefined || value === "") {
        errors[field.id] = "Dieses Feld ist ein Pflichtfeld.";
      } else if (
        field.type === "multiselect" &&
        Array.isArray(value) &&
        value.length === 0
      ) {
        errors[field.id] = "Bitte waehlen Sie mindestens eine Option.";
      } else if (field.type === "boolean" && value === null) {
        errors[field.id] = "Bitte waehlen Sie Ja oder Nein.";
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0 && formData) {
      // Zur ersten Seite mit Fehler springen
      const errorFieldIds = Object.keys(errors);
      const firstErrorIdx = formData.fields.findIndex((f) =>
        errorFieldIds.includes(f.id),
      );
      if (firstErrorIdx >= 0) {
        setCurrentPage(Math.floor(firstErrorIdx / FIELDS_PER_PAGE));
      }
    }

    return Object.keys(errors).length === 0;
  };

  // Absenden
  const submit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const answerArray = Object.entries(answers).map(([field_id, value]) => ({
        field_id,
        value,
      }));

      const res = await fetch(`/api/anamnese/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler beim Absenden.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lade-Zustand
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#4CAF87]" />
        <p className="mt-4 text-lg text-gray-600">Bogen wird geladen...</p>
      </div>
    );
  }

  // Fehler-Zustand (Token ungueltig, abgelaufen, etc.)
  if (error && !formData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-8 py-16 text-center">
        <AlertCircle className="h-14 w-14 text-red-400" />
        <h1 className="mt-4 text-xl font-semibold text-[#2D3142]">
          Bogen nicht verfuegbar
        </h1>
        <p className="mt-2 text-gray-600">{error}</p>
        <p className="mt-4 text-sm text-gray-500">
          Bitte wenden Sie sich an Ihre Arztpraxis fuer einen neuen Link.
        </p>
      </div>
    );
  }

  // Erfolgs-Zustand
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-8 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-[#4CAF87]" />
        <h1 className="mt-6 text-2xl font-semibold text-[#2D3142]">
          Vielen Dank!
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Ihr Anamnese-Bogen wurde erfolgreich eingereicht.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Ihr Arzt erhaelt Ihre Angaben automatisch vor dem Termin.
        </p>
        <div className="mt-6 rounded-lg bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Sie koennen dieses Fenster jetzt schliessen.
          </p>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  // Pagination
  const totalPages = Math.ceil(formData.fields.length / FIELDS_PER_PAGE);
  const pageFields = formData.fields.slice(
    currentPage * FIELDS_PER_PAGE,
    (currentPage + 1) * FIELDS_PER_PAGE,
  );
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4CAF87]/10">
          <ClipboardList className="h-8 w-8 text-[#4CAF87]" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-[#2D3142]">
          {formData.template_name}
        </h1>
        {formData.template_description && (
          <p className="mt-2 text-gray-600">{formData.template_description}</p>
        )}
        <p className="mt-3 text-sm text-gray-500">
          Bitte fuellen Sie die folgenden Felder aus. Pflichtfelder sind mit *
          markiert.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Ihre Angaben werden verschluesselt uebertragen und sind nur fuer Ihren
          Arzt sichtbar.
        </p>
      </div>

      {/* Fortschrittsbalken */}
      {totalPages > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Seite {currentPage + 1} von {totalPages}
            </span>
            <span>{formData.fields.length} Felder insgesamt</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-[#4CAF87] transition-all duration-300"
              style={{
                width: `${((currentPage + 1) / totalPages) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Felder der aktuellen Seite */}
      <div className="space-y-6">
        {pageFields.map((field) => (
          <AnamneseFormField
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(value) => updateAnswer(field.id, value)}
            error={validationErrors[field.id]}
          />
        ))}
      </div>

      {/* Fehler-Anzeige */}
      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation + Submit */}
      <div className="mt-8 flex items-center justify-between">
        {/* Zurueck-Button */}
        {currentPage > 0 ? (
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50"
            style={{ minHeight: "52px" }}
          >
            <ChevronLeft className="h-5 w-5" />
            Zurueck
          </button>
        ) : (
          <div />
        )}

        {/* Weiter oder Absenden */}
        {isLastPage ? (
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4CAF87] px-8 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#3d9a73] disabled:opacity-60"
            style={{ minHeight: "52px" }}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {submitting ? "Wird gesendet..." : "Bogen absenden"}
          </button>
        ) : (
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4CAF87] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#3d9a73]"
            style={{ minHeight: "52px" }}
          >
            Weiter
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Datenschutz-Hinweis */}
      <div className="mt-8 rounded-lg bg-gray-50 px-4 py-3 text-center text-xs text-gray-400">
        <p>
          Ihre Daten werden mit AES-256-GCM verschluesselt und auf Servern in
          Deutschland gespeichert.
        </p>
        <p className="mt-1">
          Nur Ihr behandelnder Arzt hat Zugriff auf Ihre Angaben (DSGVO Art. 9).
        </p>
      </div>
    </div>
  );
}
