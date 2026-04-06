"use client";

// Buerger-Postfach: Nachricht an die zustaendige Kommune senden
// Vertikaler Durchstich — minimaler Flow ohne Threads/Attachments

import { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function PostfachNeuPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit =
    subject.trim().length >= 3 &&
    body.trim().length >= 10 &&
    !sending &&
    !success;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/postfach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nachricht konnte nicht gesendet werden.");
        return;
      }

      setSuccess(
        `Ihre Nachricht wurde an ${data.org_name ?? "Ihre Kommune"} gesendet.`,
      );
      setSubject("");
      setBody("");
    } catch {
      setError("Netzwerkfehler. Bitte pruefen Sie Ihre Internetverbindung.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nachricht an die Kommune"
        subtitle="Senden Sie eine allgemeine Anfrage an Ihre zustaendige Gemeindeverwaltung."
        backHref="/dashboard"
      />

      {/* Erfolgsmeldung */}
      {success && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div>
            <p className="font-medium">{success}</p>
            <p className="mt-1 text-green-700">
              Die Verwaltung wird sich bei Ihnen melden.
            </p>
          </div>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {/* Formular */}
      {!success && (
        <form onSubmit={handleSubmit} className="mx-4 mt-6 space-y-4">
          <div>
            <label
              htmlFor="postfach-subject"
              className="mb-1 block text-sm font-medium text-[#2D3142]"
            >
              Betreff
            </label>
            <input
              id="postfach-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              placeholder="Worum geht es?"
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
            <p className="mt-1 text-xs text-gray-400">
              {subject.length}/200 Zeichen
            </p>
          </div>

          <div>
            <label
              htmlFor="postfach-body"
              className="mb-1 block text-sm font-medium text-[#2D3142]"
            >
              Nachricht
            </label>
            <textarea
              id="postfach-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              placeholder="Beschreiben Sie Ihr Anliegen..."
              maxLength={2000}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
            <p className="mt-1 text-xs text-gray-400">
              {body.length}/2000 Zeichen
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4CAF87] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3d9a73] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Wird gesendet..." : "Nachricht senden"}
          </button>
        </form>
      )}
    </div>
  );
}
