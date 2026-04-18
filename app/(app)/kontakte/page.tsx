"use client";

// /kontakte — Kontakt-Verwaltung: akzeptierte Kontakte, offene Anfragen,
// eigene gesendete Anfragen. Schnell-Aktion fuer Chat-Start.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Check, X, MessageCircle } from "lucide-react";
import {
  listContacts,
  updateContactStatus,
  openConversation,
} from "@/lib/chat/client";
import type { ContactWithProfile } from "@/modules/chat/services/contacts.service";
import { useRouter } from "next/navigation";

export default function KontaktePage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState<ContactWithProfile[]>([]);
  const [incoming, setIncoming] = useState<ContactWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<ContactWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listContacts();
      setAccepted(all.filter((c) => c.status === "accepted"));
      setIncoming(
        all.filter((c) => c.status === "pending" && c.direction === "incoming"),
      );
      setOutgoing(
        all.filter((c) => c.status === "pending" && c.direction === "outgoing"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAccept(peerId: string) {
    try {
      await updateContactStatus(peerId, "accepted");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annehmen fehlgeschlagen");
    }
  }

  async function handleReject(peerId: string) {
    try {
      await updateContactStatus(peerId, "rejected");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ablehnen fehlgeschlagen");
    }
  }

  async function handleStartChat(peerId: string) {
    try {
      const conv = await openConversation(peerId);
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chat-Start fehlgeschlagen",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3">
        <Link
          href="/chat"
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[#2D3142]"
          aria-label="Zurueck"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="flex-1 text-lg font-bold text-[#2D3142]">Kontakte</h1>
        <Link
          href="/kontakte/neu"
          className="flex h-14 min-w-20 items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-4 text-sm font-semibold text-white"
        >
          <UserPlus className="h-5 w-5" />
          Einladen
        </Link>
      </header>

      {error ? (
        <div className="m-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="p-6 text-center text-sm text-[#2D3142]/60">
          Wird geladen...
        </div>
      ) : (
        <>
          {incoming.length > 0 ? (
            <section className="border-b border-[#2D3142]/10">
              <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-amber-900">
                Offene Anfragen
              </h2>
              {incoming.map((c) => (
                <div
                  key={c.other_user_id}
                  className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-amber-50/50 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#2D3142]">
                      {c.other_display_name ??
                        `${c.other_user_id.slice(0, 8)}…`}
                    </p>
                    {c.note ? (
                      <p className="truncate text-sm text-[#2D3142]/70">
                        &ldquo;{c.note}&rdquo;
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAccept(c.other_user_id)}
                    aria-label="Annehmen"
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4CAF87] text-white"
                  >
                    <Check className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(c.other_user_id)}
                    aria-label="Ablehnen"
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2D3142]/20 bg-white text-[#2D3142]"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              ))}
            </section>
          ) : null}

          <section>
            <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-[#2D3142]/60">
              Mein Kreis
            </h2>
            {accepted.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#2D3142]/60">
                Noch niemand im Kreis.{" "}
                <Link href="/kontakte/neu" className="underline">
                  Einladen
                </Link>
              </div>
            ) : (
              accepted.map((c) => (
                <div
                  key={c.other_user_id}
                  className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#2D3142]">
                      {c.other_display_name ??
                        `${c.other_user_id.slice(0, 8)}…`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartChat(c.other_user_id)}
                    className="flex h-14 min-w-20 items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-3 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Chat
                  </button>
                </div>
              ))
            )}
          </section>

          {outgoing.length > 0 ? (
            <section>
              <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-[#2D3142]/60">
                Gesendete Anfragen
              </h2>
              {outgoing.map((c) => (
                <div
                  key={c.other_user_id}
                  className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-[#2D3142]">
                      {c.other_display_name ??
                        `${c.other_user_id.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-[#2D3142]/60">
                      wartet auf Antwort
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReject(c.other_user_id)}
                    className="text-sm font-medium text-[#2D3142]/70 underline"
                  >
                    Zuruecknehmen
                  </button>
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
