"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import type { GroupPostComment } from "@/modules/gruppen/services/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return days < 7
    ? `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`
    : new Date(dateStr).toLocaleDateString("de-DE");
}

interface GroupPostCommentsProps {
  postId: string;
  groupId: string;
  currentUserId: string;
  onCommentAdded?: () => void;
}

export function GroupPostComments({ postId, groupId, currentUserId, onCommentAdded }: GroupPostCommentsProps) {
  const [comments, setComments] = useState<GroupPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((data: GroupPostComment[]) => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [groupId, postId]);

  async function handleSubmit() {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const comment: GroupPostComment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
        onCommentAdded?.();
      }
    } catch {
      // Stille Fehlerbehandlung
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-xs text-gray-400">Laden...</p>;

  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500">
            {(c.users?.display_name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-anthrazit">
              {c.users?.display_name ?? "Unbekannt"}
            </span>
            <span className="ml-2 text-[10px] text-gray-400">{timeAgo(c.created_at)}</span>
            <p className="text-xs text-gray-600">{c.content}</p>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Kommentar schreiben..."
          maxLength={300}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-quartier-green focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim() || sending}
          className="rounded-lg bg-quartier-green p-1.5 text-white hover:bg-quartier-green/90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
