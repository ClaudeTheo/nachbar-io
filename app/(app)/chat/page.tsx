"use client";

// /chat — Hauptliste: 1:1-Konversationen + Chat-Gruppen kombiniert
// + Kontaktanfragen (pending) am oberen Rand.

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, UserPlus, Users } from "lucide-react";
import { ConversationListItem } from "@/components/chat/ConversationListItem";
import {
  listConversations,
  listMyGroups,
  listContacts,
} from "@/lib/chat/client";
import type { ConversationWithPeer } from "@/modules/chat/services/conversations.service";
import type { ChatGroup } from "@/modules/chat/services/chat-groups.service";
import type { ContactWithProfile } from "@/modules/chat/services/contacts.service";

export default function ChatOverviewPage() {
  const [conversations, setConversations] = useState<ConversationWithPeer[]>(
    [],
  );
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    ContactWithProfile[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [convs, grps, pending] = await Promise.all([
          listConversations(),
          listMyGroups(),
          listContacts("pending"),
        ]);
        if (cancelled) return;
        setConversations(convs);
        setGroups(grps);
        setIncomingRequests(pending.filter((r) => r.direction === "incoming"));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-base text-[#2D3142]/60">
        Wird geladen...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-[#2D3142]/10 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#2D3142]">Nachrichten</h1>
          <div className="flex gap-2">
            <Link
              href="/kontakte"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2D3142]/20 bg-white text-[#2D3142]"
              aria-label="Kontakte"
            >
              <UserPlus className="h-6 w-6" />
            </Link>
            <Link
              href="/chat-groups/neu"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4CAF87] text-white"
              aria-label="Neue Gruppe"
            >
              <Users className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="m-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {incomingRequests.length > 0 ? (
        <section className="border-b border-[#2D3142]/10 bg-amber-50 px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold text-amber-950">
            {incomingRequests.length} offene Kontaktanfrage
            {incomingRequests.length === 1 ? "" : "n"}
          </h2>
          <Link
            href="/kontakte"
            className="inline-flex min-h-14 items-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-amber-900"
          >
            Anfragen ansehen
          </Link>
        </section>
      ) : null}

      <section>
        <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-[#2D3142]/60">
          Gruppen
        </h2>
        {groups.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[#2D3142]/60">
            Noch keine Gruppen.{" "}
            <Link href="/chat-groups/neu" className="underline">
              Gruppe anlegen
            </Link>
          </div>
        ) : (
          groups.map((g) => (
            <ConversationListItem
              key={g.id}
              href={`/chat-groups/${g.id}`}
              title={g.name}
              subtitle={g.description ?? undefined}
              lastMessageAt={g.last_message_at}
              isGroup
            />
          ))
        )}
      </section>

      <section>
        <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-[#2D3142]/60">
          Einzelchats
        </h2>
        {conversations.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-[#2D3142]/60">
            Noch keine Einzelchats. Unter{" "}
            <Link href="/kontakte" className="underline">
              Kontakte
            </Link>{" "}
            Freunde einladen.
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationListItem
              key={c.id}
              href={`/chat/${c.id}`}
              title={
                c.peer_display_name ?? `Chat mit ${c.peer_id.slice(0, 8)}…`
              }
              lastMessageAt={c.last_message_at}
            />
          ))
        )}
      </section>

      {groups.length === 0 && conversations.length === 0 && !error ? (
        <div className="m-4 rounded-2xl border border-dashed border-[#2D3142]/20 p-6 text-center">
          <MessageCircle className="mx-auto mb-2 h-8 w-8 text-[#2D3142]/40" />
          <p className="text-sm text-[#2D3142]/70">
            Noch keine Unterhaltungen. Laden Sie erst jemanden als Kontakt ein.
          </p>
        </div>
      ) : null}
    </div>
  );
}
