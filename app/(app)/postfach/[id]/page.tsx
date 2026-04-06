// Nachbar.io — Thread-Detail (Buerger-Sicht)
// Zeigt die eigene Anfrage + Antworten vom Rathaus + Antwort-Feld

import { notFound, redirect } from "next/navigation";
import { ArrowLeft, User, Building2, Clock, FileText, ImageIcon, Download } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { decryptCivicField } from "@/lib/civic/encryption";
import { loadAttachmentsForMessages } from "@/lib/civic/attachment-utils";
import BuergerReplyBox from "./BuergerReplyBox";
import CitizenReadMarker from "./CitizenReadMarker";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  params: Promise<{ id: string }>;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  sent: { label: "Gesendet", color: "bg-gray-100 text-gray-600" },
  read: { label: "Gelesen", color: "bg-blue-100 text-blue-700" },
};

export default async function PostfachDetailPage({ params }: Props) {
  const { id } = await params;

  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminSupabase();

  // 2. Root-Nachricht laden
  const { data: root, error: rootError } = await admin
    .from("civic_messages")
    .select(
      "id, org_id, citizen_user_id, subject, body_encrypted, status, created_at, thread_id, direction",
    )
    .eq("id", id)
    .single();

  if (rootError || !root || root.citizen_user_id !== user.id || root.thread_id !== root.id) {
    notFound();
  }

  // 3. Antworten laden
  const { data: replies } = await admin
    .from("civic_messages")
    .select("id, body_encrypted, created_at, direction")
    .eq("thread_id", id)
    .neq("id", id)
    .order("created_at", { ascending: true });

  // 4. Org-Name
  const { data: org } = await admin
    .from("civic_organizations")
    .select("name")
    .eq("id", root.org_id)
    .single();

  // 5. Attachments laden
  const allRaw = [root, ...(replies ?? [])];
  const attachmentMap = await loadAttachmentsForMessages(
    admin,
    allRaw.map((m) => m.id),
  );

  // 6. Alle entschluesseln + Attachments zuordnen
  const messages = allRaw.map((msg) => {
    let body: string;
    try {
      body = decryptCivicField(msg.body_encrypted);
    } catch {
      body = "[Entschluesselung fehlgeschlagen]";
    }
    return {
      id: msg.id,
      direction: msg.direction,
      body,
      created_at: msg.created_at,
      attachments: attachmentMap[msg.id] ?? [],
    };
  });

  const style = statusLabels[root.status] ?? statusLabels.sent;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Zurueck */}
      <Link
        href="/postfach"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#2D3142]"
      >
        <ArrowLeft className="h-4 w-4" />
        Meine Nachrichten
      </Link>

      {/* Thread-Header */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-lg font-bold text-[#2D3142]">{root.subject}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {org?.name ?? "Kommune"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(root.created_at), "dd.MM.yyyy, HH:mm")}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${style.color}`}>
            {style.label}
          </span>
        </div>
      </div>

      {/* Konversation */}
      <div className="space-y-3">
        {messages.map((msg) => {
          const isMine = msg.direction === "citizen_to_staff";
          return (
            <div
              key={msg.id}
              className={`rounded-xl border p-4 ${
                isMine
                  ? "border-gray-200 bg-white"
                  : "border-[#4CAF87]/20 bg-[#4CAF87]/5"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                {isMine ? (
                  <>
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium text-gray-700">Sie</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-3.5 w-3.5 text-[#4CAF87]" />
                    <span className="font-medium text-[#4CAF87]">Rathaus</span>
                  </>
                )}
                <span>·</span>
                <span>
                  {format(new Date(msg.created_at), "dd.MM.yyyy, HH:mm")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#2D3142]">
                {msg.body}
              </p>

              {/* Attachments */}
              {msg.attachments.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                  {msg.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/postfach/${id}/attachments/${att.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[48px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors hover:bg-gray-100"
                    >
                      {att.mime_type === "application/pdf" ? (
                        <FileText className="h-4 w-4 flex-shrink-0 text-red-500" />
                      ) : (
                        <ImageIcon className="h-4 w-4 flex-shrink-0 text-blue-500" />
                      )}
                      <span className="flex-1 truncate text-[#2D3142]">{att.filename}</span>
                      <span className="text-xs text-gray-400">{formatFileSize(att.file_size)}</span>
                      <Download className="h-4 w-4 text-gray-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Antwort-Box */}
      <div className="mt-4">
        <BuergerReplyBox threadId={id} />
      </div>

      {/* Unsichtbar: Setzt citizen_read_until */}
      <CitizenReadMarker threadId={id} />
    </div>
  );
}
