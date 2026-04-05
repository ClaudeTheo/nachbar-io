"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { GroupPostCard } from "./GroupPostCard";
import type { GroupPost } from "@/modules/gruppen/services/types";

interface GroupPostFeedProps {
  groupId: string;
  isMember: boolean;
  currentUserId: string;
}

export function GroupPostFeed({ groupId, isMember, currentUserId }: GroupPostFeedProps) {
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/posts?page=0`)
      .then((r) => r.json())
      .then((data: GroupPost[]) => {
        setPosts(data);
        setHasMore(data.length >= 20);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handlePost() {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (res.ok) {
        const post: GroupPost = await res.json();
        setPosts((prev) => [post, ...prev]);
        setNewContent("");
      }
    } catch {
      // Stille Fehlerbehandlung
    } finally {
      setPosting(false);
    }
  }

  async function loadMore() {
    const nextPage = page + 1;
    const res = await fetch(`/api/groups/${groupId}/posts?page=${nextPage}`);
    const data: GroupPost[] = await res.json();
    setPosts((prev) => [...prev, ...data]);
    setPage(nextPage);
    setHasMore(data.length >= 20);
  }

  if (loading) return <p className="text-center text-gray-400">Laden...</p>;

  return (
    <div className="space-y-4">
      {isMember && (
        <div className="rounded-xl border border-border bg-white p-3">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Was moechten Sie teilen?"
            maxLength={1000}
            rows={3}
            className="w-full resize-none border-0 bg-transparent text-sm focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{newContent.length}/1000</span>
            <button
              onClick={handlePost}
              disabled={!newContent.trim() || posting}
              className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-1.5 text-sm font-medium text-white hover:bg-quartier-green/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Teilen
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="py-8 text-center text-gray-400">
          Noch keine Beitraege. Schreiben Sie den ersten!
        </p>
      ) : (
        <>
          {posts.map((post) => (
            <GroupPostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Weitere laden
            </button>
          )}
        </>
      )}
    </div>
  );
}
