import type { SupabaseClient } from "@supabase/supabase-js";

export interface CitizenPostfachThread {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  org_name: string;
  has_reply: boolean;
  unread_count: number;
}

interface CivicMessageRow {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  org_id: string;
  thread_id: string;
  direction: string;
  citizen_read_until: string | null;
}

export async function listCitizenPostfachThreads(
  admin: SupabaseClient,
  userId: string,
): Promise<CitizenPostfachThread[]> {
  const { data, error } = await admin
    .from("civic_messages")
    .select(
      "id, subject, status, created_at, org_id, thread_id, direction, citizen_read_until",
    )
    .eq("citizen_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const allMessages = (data ?? []) as CivicMessageRow[];
  const roots = allMessages.filter((message) => message.thread_id === message.id);
  const orgIds = [...new Set(roots.map((root) => root.org_id))];

  let orgMap = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs, error: orgError } = await admin
      .from("civic_organizations")
      .select("id, name")
      .in("id", orgIds);

    if (orgError) {
      throw new Error(orgError.message);
    }

    orgMap = new Map((orgs ?? []).map((org) => [org.id, org.name]));
  }

  return roots.map((root) => {
    const staffReplies = allMessages.filter(
      (message) =>
        message.thread_id === root.id &&
        message.id !== root.id &&
        message.direction === "staff_to_citizen",
    );

    const unreadCount = root.citizen_read_until
      ? staffReplies.filter(
          (reply) =>
            new Date(reply.created_at) > new Date(root.citizen_read_until!),
        ).length
      : staffReplies.length;

    return {
      id: root.id,
      subject: root.subject,
      status: root.status,
      created_at: root.created_at,
      org_name: orgMap.get(root.org_id) ?? "Unbekannt",
      has_reply: staffReplies.length > 0,
      unread_count: unreadCount,
    };
  });
}
