"use client";

// BoardComments — Kommentar-System für Board-Posts
// Klappbar unter jedem Post, max 300 Zeichen

import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Comment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  user?: { display_name: string; avatar_url: string | null };
}

interface BoardCommentsProps {
  postId: string;
  currentUserId: string | null;
}

export function BoardComments({ postId, currentUserId }: BoardCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  async function loadCommentCount() {
    const supabase = createClient();
    const { count } = await supabase
      .from("board_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    setCommentCount(count ?? 0);
  }

  useEffect(() => {
    loadCommentCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function loadComments() {
    const supabase = createClient();
    const { data } = await supabase
      .from("board_comments")
      .select(
        "id, user_id, text, created_at, user:users(display_name, avatar_url)",
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(20);

    setComments((data ?? []) as unknown as Comment[]);
  }

  function toggleExpand() {
    if (!expanded) {
      loadComments();
    }
    setExpanded(!expanded);
  }

  async function submitComment() {
    if (!currentUserId || !newComment.trim()) return;
    setSending(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("board_comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        text: newComment.trim(),
      })
      .select(
        "id, user_id, text, created_at, user:users(display_name, avatar_url)",
      )
      .single();

    if (error) {
      toast.error("Kommentar konnte nicht gesendet werden.");
      setSending(false);
      return;
    }

    setComments([...comments, data as unknown as Comment]);
    setCommentCount((c) => c + 1);
    setNewComment("");
    setSending(false);
  }

  async function deleteComment(id: string) {
    const supabase = createClient();
    await supabase.from("board_comments").delete().eq("id", id);
    setComments(comments.filter((c) => c.id !== id));
    setCommentCount((c) => c - 1);
    toast.success("Kommentar entfernt.");
  }

  return (
    <div className="mt-2">
      {/* Toggle-Button */}
      <button
        onClick={toggleExpand}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-anthrazit"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {commentCount > 0
          ? `${commentCount} Kommentar${commentCount !== 1 ? "e" : ""}`
          : "Kommentieren"}
      </button>

      {/* Kommentare */}
      {expanded && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {(comment.user?.display_name ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-anthrazit">
                    {comment.user?.display_name ?? "Nachbar"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
                <p className="text-xs text-anthrazit">{comment.text}</p>
              </div>
              {comment.user_id === currentUserId && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-red-500"
                  aria-label="Kommentar löschen"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* Neuer Kommentar */}
          {currentUserId && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newComment.trim()) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                placeholder="Kommentar schreiben..."
                maxLength={300}
                className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none"
              />
              <Button
                size="sm"
                onClick={submitComment}
                disabled={sending || !newComment.trim()}
                className="h-8 bg-quartier-green px-2 hover:bg-quartier-green-dark"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
