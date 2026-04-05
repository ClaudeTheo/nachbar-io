"use client";

// /praevention/bewertung — Kurs-Bewertung schreiben (fuer Gold-Stufe)
// Design-Ref: docs/plans/2026-04-05-kursbelohnung-plus-trial-design.md

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Send, CheckCircle } from "lucide-react";

function BewertungContent() {
  const searchParams = useSearchParams();
  const enrollmentIdParam = searchParams.get("enrollmentId");

  const [enrollmentId, setEnrollmentId] = useState<string | null>(
    enrollmentIdParam,
  );
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let eid = enrollmentIdParam;

        if (!eid) {
          const progRes = await fetch("/api/prevention/progress");
          if (progRes.ok) {
            const progress = await progRes.json();
            eid = progress.enrollment?.id;
            setEnrollmentId(eid);
          }
        }

        if (!eid) {
          setError("Kein abgeschlossener Kurs gefunden");
          return;
        }

        // Vorhandene Bewertung laden
        const revRes = await fetch(
          `/api/prevention/review?enrollmentId=${eid}`,
        );
        if (revRes.ok) {
          const review = await revRes.json();
          if (review) {
            setRating(review.rating);
            setText(review.text || "");
            setExistingReview(true);
          }
        }
      } catch {
        setError("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [enrollmentIdParam]);

  const handleSubmit = async () => {
    if (!enrollmentId || rating === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/prevention/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          rating,
          text: text.trim() || null,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Fehler beim Speichern");
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="mb-4 text-gray-600">{error}</p>
        <Link href="/praevention" className="text-emerald-600 underline">
          Zurueck
        </Link>
      </div>
    );
  }

  // Erfolgs-Bildschirm
  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Vielen Dank fuer Ihre Bewertung!
        </h2>
        <p className="mb-6 text-gray-600">
          {rating >= 3 && text
            ? "Sie haben die Gold-Stufe erreicht — 3 Monate Nachbar Plus fuer Ihre Angehoerigen!"
            : "Ihre Bewertung hilft uns, den Kurs zu verbessern."}
        </p>

        {rating >= 3 && text && (
          <div className="mb-6 rounded-xl bg-yellow-50 p-4">
            <p className="text-4xl mb-2">🥇</p>
            <p className="font-semibold text-yellow-700">
              Gold-Stufe freigeschaltet!
            </p>
            <p className="text-sm text-yellow-600">
              Besuchen Sie die Belohnungsseite, um den Bonus zu aktivieren.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={`/praevention/belohnung${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}
            className="block w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Zur Belohnung →
          </Link>
          <Link
            href="/praevention"
            className="block text-sm text-emerald-600 underline"
          >
            Zurueck zum Kurs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/praevention" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">
          Kurs bewerten
        </h1>
      </div>

      {/* Gold-Hinweis */}
      <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
        <p className="text-sm text-yellow-800">
          <strong>🥇 Gold-Stufe:</strong> Bewerten Sie den Kurs mit mindestens 3
          Sternen und einem kurzen Text, um 3 Monate Nachbar Plus fuer Ihre
          Angehoerigen freizuschalten.
        </p>
      </div>

      {/* Sterne-Bewertung */}
      <div className="mb-6">
        <label className="mb-3 block text-sm font-medium text-gray-700">
          Wie bewerten Sie den Kurs?
        </label>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              style={{ minWidth: "56px", minHeight: "56px" }}
            >
              <Star
                className={`h-10 w-10 ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-center text-sm text-gray-500">
            {rating === 1 && "Mangelhaft"}
            {rating === 2 && "Ausreichend"}
            {rating === 3 && "Befriedigend"}
            {rating === 4 && "Gut"}
            {rating === 5 && "Sehr gut"}
          </p>
        )}
      </div>

      {/* Text */}
      <div className="mb-6">
        <label
          htmlFor="reviewText"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Ihre Erfahrung{" "}
          <span className="text-gray-400">(fuer Gold-Stufe erforderlich)</span>
        </label>
        <textarea
          id="reviewText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was hat Ihnen besonders gefallen? Was koennte verbessert werden?"
          rows={4}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          {text.length > 0
            ? `${text.length} Zeichen`
            : "Mindestens ein kurzer Satz fuer die Gold-Stufe"}
        </p>
      </div>

      {/* Status */}
      {rating >= 3 && text.trim().length > 0 && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-center">
          <p className="text-sm font-medium text-yellow-700">
            🥇 Diese Bewertung qualifiziert Sie fuer die Gold-Stufe!
          </p>
        </div>
      )}

      {/* Absenden */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
        style={{ minHeight: "80px" }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Wird gespeichert...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Send className="h-5 w-5" />
            {existingReview ? "Bewertung aktualisieren" : "Bewertung abgeben"}
          </span>
        )}
      </button>
    </div>
  );
}

export default function BewertungPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <BewertungContent />
    </Suspense>
  );
}
