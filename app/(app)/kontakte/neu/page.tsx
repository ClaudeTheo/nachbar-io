"use client";

// /kontakte/neu — Neue Kontaktanfrage per User-ID (spaeter: Email/Suche)
//
// MVP: User-ID-Eingabe direkt. In Schritt 4 (Invite-Flow) kommt
// shareable link + Email-Suche.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendContactRequest } from "@/lib/chat/client";
import { MyUserIdCard } from "@/components/chat/MyUserIdCard";

export default function NeuerKontaktPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || submitting) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await sendContactRequest(
        userId.trim(),
        note.trim() || undefined,
      );
      if (result.status === "accepted") {
        setSuccess("Kontakt sofort bestaetigt (gegenseitige Einladung).");
        setTimeout(() => router.push("/kontakte"), 1200);
      } else {
        setSuccess("Anfrage gesendet.");
        setTimeout(() => router.push("/kontakte"), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senden fehlgeschlagen");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3">
        <Link
          href="/kontakte"
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[#2D3142]"
          aria-label="Zurueck"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg font-bold text-[#2D3142]">Neuer Kontakt</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <MyUserIdCard />

        <div className="rounded-2xl border border-[#2D3142]/10 bg-[#F8F9FA] p-4 text-sm text-[#2D3142]/80">
          <strong>Tipp:</strong> Fragen Sie Ihren Bekannten nach seiner
          Nutzer-ID. Spaeter gibt es auch einen Einladungs-Link.
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#2D3142]">
            Nutzer-ID
          </span>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            placeholder="UUID des anderen Nutzers"
            className="min-h-20 w-full rounded-2xl border border-[#2D3142]/20 bg-white px-4 py-3 font-mono text-sm focus:border-[#4CAF87] focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#2D3142]">
            Kurze Nachricht (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="z.B. Hallo, hier ist Maria von nebenan!"
            className="w-full rounded-2xl border border-[#2D3142]/20 bg-white px-4 py-3 text-base focus:border-[#4CAF87] focus:outline-none"
          />
          <span className="mt-1 block text-right text-xs text-[#2D3142]/60">
            {note.length}/280
          </span>
        </label>

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-900">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!userId.trim() || submitting}
          className="flex min-h-20 w-full items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-4 text-base font-semibold text-white disabled:opacity-50"
        >
          <UserPlus className="h-5 w-5" />
          {submitting ? "Wird gesendet..." : "Anfrage senden"}
        </button>
      </form>
    </div>
  );
}
