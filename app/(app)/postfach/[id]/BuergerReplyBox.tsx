"use client";

// Buerger-Antwort-Box fuer das Postfach
// Sendet verschluesselte Antwort im bestehenden Thread

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

interface Props {
  threadId: string;
}

export default function BuergerReplyBox({ threadId }: Props) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const charCount = body.trim().length;
  const isValid = charCount >= 10 && charCount <= 2000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/postfach/${threadId}/antwort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Antwort konnte nicht gesendet werden.");
        return;
      }

      setBody("");
      setSuccess(true);
      router.refresh();

      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <label
        htmlFor="reply-body"
        className="mb-2 block text-sm font-medium text-[#2D3142]"
      >
        Ihre Antwort an das Rathaus
      </label>

      <textarea
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ihre Antwort (mind. 10 Zeichen)..."
        rows={4}
        maxLength={2000}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2D3142] placeholder-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
        disabled={loading}
      />

      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-xs ${charCount > 1900 ? "text-amber-600" : "text-gray-400"}`}
        >
          {charCount} / 2000
        </span>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#4CAF87] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d9a73] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? "Wird gesendet..." : "Antwort senden"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-2 text-sm text-[#4CAF87]">
          Antwort wurde erfolgreich gesendet.
        </p>
      )}
    </form>
  );
}
