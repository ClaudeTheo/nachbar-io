"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Pin, Send, Trash2, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuarter } from "@/lib/quarters";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { HelpRequest } from "@/lib/supabase/types";
import { BoardComments } from "@/components/BoardComments";
import { validateImageFile, compressImage, MAX_DIMENSION } from "@/lib/storage";
import { GuidelinesGate } from "@/components/moderation/GuidelinesAcceptance";

export default function BoardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { currentQuarter } = useQuarter();

  const loadPosts = useCallback(async () => {
    if (!currentQuarter || !user) return;
    const supabase = createClient();

    try {
      // Letzte 7 Tage laden
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("help_requests")
        .select("*, user:users(display_name, avatar_url)")
        .eq("quarter_id", currentQuarter.id)
        .eq("category", "board")
        .eq("status", "active")
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setPosts(data as unknown as HelpRequest[]);
    } catch {
      toast.error("Beiträge konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [currentQuarter, user]);

  useEffect(() => {
    loadPosts();

    // Realtime-Updates
    const supabase = createClient();
    const channel = supabase
      .channel("board-updates")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "help_requests",
        filter: "category=eq.board",
      }, () => {
        loadPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { toast.error(err); return; }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setSelectedImage(null);
    setImagePreview(null);
  }

  async function submitPost() {
    if (!user?.id || !newPost.trim()) return;
    setSending(true);

    const supabase = createClient();
    let imageUrl: string | null = null;

    // Bild hochladen falls vorhanden
    if (selectedImage) {
      try {
        const blob = await compressImage(selectedImage, MAX_DIMENSION);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const uuid = crypto.randomUUID();
        const path = `board/${currentQuarter?.id}/${uuid}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(path, blob, { contentType: blob.type });

        if (uploadError) {
          toast.error("Bild-Upload fehlgeschlagen.");
          setSending(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      } catch {
        toast.error("Bild konnte nicht verarbeitet werden.");
        setSending(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("help_requests")
      .insert({
        user_id: user.id,
        quarter_id: currentQuarter?.id,
        type: "offer",
        category: "board",
        title: newPost.trim(),
        description: null,
        status: "active",
        image_url: imageUrl,
      })
      .select("*, user:users(display_name, avatar_url)")
      .single();

    if (error) {
      toast.error("Beitrag konnte nicht gesendet werden.");
      setSending(false);
      return;
    }

    setPosts([data as unknown as HelpRequest, ...posts]);
    setNewPost("");
    setSelectedImage(null);
    setImagePreview(null);
    toast.success("Beitrag veröffentlicht!");
    setSending(false);
  }

  async function deletePost(id: string) {
    const supabase = createClient();
    await supabase.from("help_requests").update({ status: "closed" }).eq("id", id);
    setPosts(posts.filter((p) => p.id !== id));
    toast.success("Beitrag entfernt.");
  }

  // Enter-Taste zum Senden
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newPost.trim()) submitPost();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <GuidelinesGate>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Schwarzes Brett</h1>
      </div>

      {/* Info */}
      <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4">
        <div className="flex items-start gap-3">
          <Pin className="mt-0.5 h-5 w-5 text-purple-600" />
          <p className="text-sm text-purple-700">
            Kurze Nachrichten an alle Nachbarn. Zucchini übrig? Straße gesperrt?
            Elektriker gesucht? Einfach posten!
          </p>
        </div>
      </div>

      {/* Neuer Beitrag */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <textarea
          placeholder="Was gibt es Neues im Quartier?"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={300}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-muted/30 p-3 text-sm placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none"
        />
        {/* Bild-Vorschau */}
        {imagePreview && (
          <div className="mt-2 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Vorschau" className="h-20 w-20 rounded-lg object-cover" />
            <button
              onClick={removeImage}
              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{newPost.length}/300</span>
            <label className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
              <ImageIcon className="h-3.5 w-3.5" />
              Bild
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          </div>
          <Button
            onClick={submitPost}
            disabled={sending || !newPost.trim()}
            size="sm"
            className="bg-quartier-green text-white hover:bg-quartier-green-dark"
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            {sending ? "..." : "Posten"}
          </Button>
        </div>
      </div>

      {/* Beiträge */}
      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                  {(post.user?.display_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-anthrazit">
                      {post.user?.display_name ?? "Nachbar"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-anthrazit whitespace-pre-line">{post.title}</p>
                  {/* Bild */}
                  {(post as HelpRequest & { image_url?: string }).image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(post as HelpRequest & { image_url?: string }).image_url!}
                      alt="Bild zum Beitrag"
                      className="mt-2 max-h-48 rounded-lg object-cover"
                    />
                  )}
                  {/* Kommentare */}
                  <BoardComments postId={post.id} currentUserId={user?.id ?? null} />
                </div>
                {post.user_id === user?.id && (
                  <button
                    onClick={() => deletePost(post.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-anthrazit"
                    aria-label="Beitrag löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mb-3 text-5xl" aria-hidden="true">📌</div>
          <p className="text-muted-foreground">Noch keine Beiträge. Starten Sie die Unterhaltung!</p>
        </div>
      )}
    </div>
    </GuidelinesGate>
  );
}
