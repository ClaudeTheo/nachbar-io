"use client";

// /chat-groups/neu — Neue Chat-Gruppe erstellen.
// Nach Erfolg: Weiterleitung in den Gruppen-Chat.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createGroup } from "@/lib/chat/client";

export default function NeueGruppePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const group = await createGroup(
        name.trim(),
        description.trim() || undefined,
      );
      router.push(`/chat-groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erstellen fehlgeschlagen");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3">
        <Link
          href="/chat"
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[#2D3142]"
          aria-label="Zurueck"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg font-bold text-[#2D3142]">Neue Gruppe</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#2D3142]">
            Name der Gruppe
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="z.B. Familie Mueller"
            className="min-h-20 w-full rounded-2xl border border-[#2D3142]/20 bg-white px-4 py-3 text-base focus:border-[#4CAF87] focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#2D3142]">
            Beschreibung (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Worum geht es in der Gruppe?"
            className="w-full rounded-2xl border border-[#2D3142]/20 bg-white px-4 py-3 text-base focus:border-[#4CAF87] focus:outline-none"
          />
        </label>

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="flex min-h-20 w-full items-center justify-center rounded-2xl bg-[#4CAF87] px-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Wird erstellt..." : "Gruppe erstellen"}
        </button>

        <p className="text-center text-sm text-[#2D3142]/60">
          Sie werden automatisch Admin der Gruppe. Bis zu 10 Mitglieder
          moeglich.
        </p>
      </form>
    </div>
  );
}
