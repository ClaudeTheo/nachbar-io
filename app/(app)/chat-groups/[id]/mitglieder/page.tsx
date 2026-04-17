"use client";

// /chat-groups/[id]/mitglieder — Mitglieder verwalten: Liste + Hinzufuegen
// aus eigenen akzeptierten Kontakten. Admins koennen entfernen.

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import {
  listGroupMembers,
  addGroupMember,
  removeGroupMember,
  listContacts,
  ChatApiError,
} from "@/lib/chat/client";
import { createClient } from "@/lib/supabase/client";
import type { ChatGroupMember } from "@/modules/chat/services/chat-groups.service";
import type { ContactWithProfile } from "@/modules/chat/services/contacts.service";

const MAX_MEMBERS = 10;

export default function GroupMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);
  const router = useRouter();
  const [members, setMembers] = useState<ChatGroupMember[]>([]);
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersList, acceptedContacts] = await Promise.all([
        listGroupMembers(groupId),
        listContacts("accepted"),
      ]);
      setMembers(membersList);
      setContacts(acceptedContacts);
    } catch (err) {
      setError(
        err instanceof ChatApiError && err.status === 403
          ? "Kein Zugriff auf diese Gruppe"
          : err instanceof Error
            ? err.message
            : "Laden fehlgeschlagen",
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const iAmAdmin = members.some(
    (m) => m.user_id === currentUserId && m.role === "admin",
  );

  const memberIds = new Set(members.map((m) => m.user_id));
  const addableContacts = contacts.filter(
    (c) => !memberIds.has(c.other_user_id),
  );

  async function handleAdd(userId: string) {
    setWorking(true);
    setError(null);
    try {
      await addGroupMember(groupId, userId);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Hinzufuegen fehlgeschlagen",
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRemove(userId: string) {
    setWorking(true);
    setError(null);
    try {
      await removeGroupMember(groupId, userId);
      if (userId === currentUserId) {
        router.push("/chat");
        return;
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entfernen fehlgeschlagen");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3">
        <Link
          href={`/chat-groups/${groupId}`}
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[#2D3142]"
          aria-label="Zurueck"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-lg font-bold text-[#2D3142]">Mitglieder</h1>
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
          <section>
            <h2 className="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-[#2D3142]/60">
              {members.length} von {MAX_MEMBERS} Mitglieder
            </h2>
            {members.map((m) => {
              const isMe = m.user_id === currentUserId;
              const canRemove = iAmAdmin || isMe;
              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#2D3142]">
                      {isMe ? "Sie" : `${m.user_id.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-[#2D3142]/60">
                      {m.role === "admin" ? "Admin" : "Mitglied"}
                    </p>
                  </div>
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(m.user_id)}
                      disabled={working}
                      aria-label={
                        isMe ? "Gruppe verlassen" : "Mitglied entfernen"
                      }
                      className="flex h-14 min-w-14 items-center justify-center gap-1 rounded-2xl border border-[#2D3142]/20 bg-white px-3 text-sm font-medium text-[#2D3142] disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                      {isMe ? "Verlassen" : null}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>

          {iAmAdmin && members.length < MAX_MEMBERS ? (
            <section>
              <h2 className="px-4 pt-6 pb-2 text-sm font-semibold uppercase tracking-wide text-[#2D3142]/60">
                Kontakt hinzufuegen
              </h2>
              {addableContacts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[#2D3142]/60">
                  Alle Kontakte sind bereits in der Gruppe.{" "}
                  <Link href="/kontakte/neu" className="underline">
                    Neuen Kontakt einladen
                  </Link>
                </div>
              ) : (
                addableContacts.map((c) => (
                  <div
                    key={c.other_user_id}
                    className="flex items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-[#2D3142]">
                        {c.other_user_id.slice(0, 8)}…
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(c.other_user_id)}
                      disabled={working}
                      aria-label="Zur Gruppe hinzufuegen"
                      className="flex h-14 min-w-20 items-center justify-center gap-2 rounded-2xl bg-[#4CAF87] px-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <UserPlus className="h-5 w-5" />
                      Hinzu
                    </button>
                  </div>
                ))
              )}
            </section>
          ) : null}

          {!iAmAdmin ? (
            <p className="p-4 text-center text-sm text-[#2D3142]/60">
              Nur Admins koennen Mitglieder hinzufuegen.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
