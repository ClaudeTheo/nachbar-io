"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Users, User } from "lucide-react";

interface SentMessage {
  id: string;
  message_type: string;
  subject: string | null;
  body: string;
  created_at: string;
  recipient?: { display_name: string } | null;
}

interface Participant {
  userId: string;
  displayName: string;
}

export default function NachrichtenPage() {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Formular
  const [mode, setMode] = useState<"broadcast" | "individual">("broadcast");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const dashRes = await fetch("/api/prevention/dashboard");
      if (!dashRes.ok) return;
      const dashboard = await dashRes.json();
      setCourseId(dashboard.courseId);

      // Gesendete Nachrichten + Teilnehmer parallel laden
      const [msgRes, partRes] = await Promise.all([
        fetch(`/api/prevention/messages?courseId=${dashboard.courseId}`),
        fetch(
          `/api/prevention/dashboard/participants?courseId=${dashboard.courseId}`,
        ),
      ]);

      if (msgRes.ok) setMessages(await msgRes.json());
      if (partRes.ok) setParticipants(await partRes.json());
    } catch (err) {
      console.error("Daten laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!courseId || !body.trim()) return;
    setSending(true);

    try {
      const url =
        mode === "broadcast"
          ? "/api/prevention/messages/broadcast"
          : "/api/prevention/messages";

      const payload =
        mode === "broadcast"
          ? { courseId, subject, message: body }
          : {
              action: "send" as const,
              courseId,
              recipientId,
              subject,
              message: body,
            };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubject("");
        setBody("");
        setRecipientId("");
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Senden fehlgeschlagen");
      }
    } catch {
      alert("Netzwerkfehler");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nachrichten</h1>
          <p className="text-sm text-gray-500">An Kursteilnehmer senden</p>
        </div>
      </div>

      {/* Formular */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {/* Modus-Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("broadcast")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              mode === "broadcast"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
            style={{ minHeight: "44px" }}
          >
            <Users className="h-4 w-4" />
            An alle
          </button>
          <button
            onClick={() => setMode("individual")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              mode === "individual"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
            style={{ minHeight: "44px" }}
          >
            <User className="h-4 w-4" />
            Einzeln
          </button>
        </div>

        {/* Empfaenger-Auswahl (nur bei Einzelnachricht) */}
        {mode === "individual" && (
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-base"
            style={{ minHeight: "48px" }}
          >
            <option value="">Teilnehmer auswählen...</option>
            {participants.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.displayName}
              </option>
            ))}
          </select>
        )}

        {/* Betreff */}
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Betreff (optional)"
          className="mb-3 w-full rounded-xl border border-gray-200 p-3 text-base"
          style={{ minHeight: "48px" }}
        />

        {/* Nachricht */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Nachricht eingeben..."
          rows={4}
          className="mb-3 w-full resize-none rounded-xl border border-gray-200 p-3 text-base"
        />

        {/* Senden */}
        <button
          onClick={handleSend}
          disabled={
            sending || !body.trim() || (mode === "individual" && !recipientId)
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-gray-300"
          style={{ minHeight: "48px" }}
        >
          <Send className="h-5 w-5" />
          {sending ? "Wird gesendet..." : "Senden"}
        </button>
      </div>

      {/* Gesendete Nachrichten */}
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        Gesendete Nachrichten
      </h2>

      {messages.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          Noch keine Nachrichten gesendet.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {msg.message_type === "broadcast" ? (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> An alle
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />{" "}
                      {msg.recipient?.display_name ?? "—"}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {msg.subject && (
                <h3 className="text-sm font-semibold text-gray-900">
                  {msg.subject}
                </h3>
              )}
              <p className="text-sm text-gray-600">{msg.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
