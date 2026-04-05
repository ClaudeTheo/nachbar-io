import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import type { GroupPost, GroupPostComment, CreatePostPayload } from "./types";
import { awardPoints } from "@/modules/gamification";

const POSTS_PER_PAGE = 20;

// Beitraege einer Gruppe (paginiert)
export async function listPosts(
  supabase: SupabaseClient,
  groupId: string,
  page = 0,
): Promise<GroupPost[]> {
  const from = page * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  const { data, error } = await supabase
    .from("group_posts")
    .select("*, users(display_name, avatar_url)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error)
    throw new ServiceError("Beitraege konnten nicht geladen werden", 500);

  // Kommentar-Anzahl pro Post
  const posts = data ?? [];
  if (posts.length === 0) return [];

  const postIds = posts.map((p: GroupPost) => p.id);
  const { data: counts } = await supabase
    .from("group_post_comments")
    .select("post_id")
    .in("post_id", postIds);

  const countMap = new Map<string, number>();
  for (const c of counts ?? []) {
    countMap.set(c.post_id, (countMap.get(c.post_id) ?? 0) + 1);
  }

  return posts.map((p: GroupPost) => ({
    ...p,
    comment_count: countMap.get(p.id) ?? 0,
  }));
}

// Neuen Beitrag erstellen (nur aktive Mitglieder)
export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  groupId: string,
  payload: CreatePostPayload,
): Promise<GroupPost> {
  // Mitgliedschaft pruefen
  const { data: membership } = await supabase
    .from("group_members")
    .select("status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership) {
    throw new ServiceError(
      "Sie muessen Mitglied der Gruppe sein, um Beitraege zu erstellen",
      403,
    );
  }

  if (!payload.content || payload.content.trim().length === 0) {
    throw new ServiceError("Beitrag darf nicht leer sein", 400);
  }
  if (payload.content.length > 1000) {
    throw new ServiceError("Beitrag darf maximal 1000 Zeichen lang sein", 400);
  }

  const { data, error } = await supabase
    .from("group_posts")
    .insert({
      group_id: groupId,
      user_id: userId,
      content: payload.content.trim(),
      image_url: payload.image_url ?? null,
    })
    .select("*, users(display_name, avatar_url)")
    .single();

  if (error)
    throw new ServiceError("Beitrag konnte nicht erstellt werden", 500);

  // Gamification: Punkte fuer Gruppen-Beitrag (fire-and-forget)
  awardPoints(supabase, userId, "group_post").catch((err) =>
    console.error("[gamification] group_post awardPoints failed:", err),
  );

  return { ...data, comment_count: 0 };
}

// Kommentare eines Beitrags
export async function listComments(
  supabase: SupabaseClient,
  postId: string,
): Promise<GroupPostComment[]> {
  const { data, error } = await supabase
    .from("group_post_comments")
    .select("*, users(display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error)
    throw new ServiceError("Kommentare konnten nicht geladen werden", 500);
  return data ?? [];
}

// Kommentar erstellen (Mitgliedschaft via Post pruefen)
export async function createComment(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  content: string,
): Promise<GroupPostComment> {
  if (!content || content.trim().length === 0) {
    throw new ServiceError("Kommentar darf nicht leer sein", 400);
  }
  if (content.length > 300) {
    throw new ServiceError("Kommentar darf maximal 300 Zeichen lang sein", 400);
  }

  // Mitgliedschaft ueber Post → Gruppe pruefen
  const { data: post } = await supabase
    .from("group_posts")
    .select("group_id")
    .eq("id", postId)
    .single();

  if (!post) throw new ServiceError("Beitrag nicht gefunden", 404);

  const { data: membership } = await supabase
    .from("group_members")
    .select("status")
    .eq("group_id", post.group_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership) {
    throw new ServiceError(
      "Sie muessen Mitglied der Gruppe sein, um zu kommentieren",
      403,
    );
  }

  const { data, error } = await supabase
    .from("group_post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content: content.trim(),
    })
    .select("*, users(display_name, avatar_url)")
    .single();

  if (error)
    throw new ServiceError("Kommentar konnte nicht erstellt werden", 500);
  return data;
}
