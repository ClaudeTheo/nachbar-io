"use client";

import { useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { GroupPostComments } from "./GroupPostComments";
import type { GroupPost } from "@/modules/gruppen/services/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
  return new Date(dateStr).toLocaleDateString("de-DE");
}

interface GroupPostCardProps {
  post: GroupPost;
  currentUserId: string;
}

export function GroupPostCard({ post, currentUserId }: GroupPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);

  const isAuthor = post.user_id === currentUserId;
  const displayName = post.users?.display_name ?? "Unbekannt";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleDelete() {
    if (!confirm("Beitrag wirklich loeschen?")) return;
    const res = await fetch(`/api/groups/${post.group_id}/posts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id }),
    });
    if (res.ok) setDeleted(true);
  }

  if (deleted) return null;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-anthrazit">{displayName}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
              {isAuthor && (
                <button onClick={handleDelete} className="text-gray-300 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{post.content}</p>
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- Gruppenbilder sind nutzergenerierte Remote-URLs; keine sichere next/image-Remote-Konfiguration vorhanden.
            <img
              src={post.image_url}
              alt="Beitragsbild"
              className="mt-2 max-h-64 rounded-lg object-cover"
            />
          )}
          <button
            onClick={() => setShowComments(!showComments)}
            className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount} {commentCount === 1 ? "Kommentar" : "Kommentare"}
          </button>
        </div>
      </div>

      {showComments && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <GroupPostComments
            postId={post.id}
            groupId={post.group_id}
            currentUserId={currentUserId}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
          />
        </div>
      )}
    </div>
  );
}
