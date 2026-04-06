// Nachbar.io — Meine Nachrichten (Buerger-Postfach)
// Thread-Liste: Eigene Anfragen an Kommunen + Antwort-Status

import { createClient } from "@/lib/supabase/server";
import { Mail, ArrowRight, MessageSquareReply, Plus } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

const statusLabels: Record<string, { label: string; color: string }> = {
  sent: { label: "Gesendet", color: "bg-gray-100 text-gray-600" },
  read: { label: "Gelesen", color: "bg-blue-100 text-blue-700" },
};

interface Thread {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  org_name: string;
  has_reply: boolean;
}

export default async function PostfachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Server-side API-Call
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let threads: Thread[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/postfach`, {
      headers: { Cookie: `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      threads = await res.json();
    }
  } catch {
    // Fallback: leere Liste
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#2D3142]">
            Meine Nachrichten
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ihre Anfragen an die Kommune
          </p>
        </div>
        <Link
          href="/postfach/neu"
          className="inline-flex items-center gap-2 rounded-lg bg-[#4CAF87] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d9a73]"
        >
          <Plus className="h-4 w-4" />
          Neue Nachricht
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-[#2D3142]">
            Noch keine Nachrichten
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Sie haben noch keine Nachrichten an Ihre Kommune gesendet.
          </p>
          <Link
            href="/postfach/neu"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#4CAF87] hover:underline"
          >
            Nachricht schreiben
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const style =
              statusLabels[thread.status] ?? statusLabels.sent;
            return (
              <Link
                key={thread.id}
                href={`/postfach/${thread.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#4CAF87]/30 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-[#2D3142]">
                      {thread.subject}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {thread.org_name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.color}`}
                  >
                    {style.label}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    {format(new Date(thread.created_at), "dd.MM.yyyy")}
                  </span>
                  {thread.has_reply && (
                    <span className="inline-flex items-center gap-1 text-[#4CAF87]">
                      <MessageSquareReply className="h-3 w-3" />
                      Antwort vom Rathaus
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
