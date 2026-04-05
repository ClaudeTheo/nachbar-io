// Gruppen-Kategorien
export type GroupCategory =
  | "nachbarschaft"
  | "sport"
  | "garten"
  | "kinder"
  | "senioren"
  | "kultur"
  | "ehrenamt"
  | "sonstiges";

export const GROUP_CATEGORY_LABELS: Record<GroupCategory, string> = {
  nachbarschaft: "Nachbarschaft",
  sport: "Sport & Bewegung",
  garten: "Garten & Natur",
  kinder: "Kinder & Familie",
  senioren: "Senioren",
  kultur: "Kultur & Freizeit",
  ehrenamt: "Ehrenamt",
  sonstiges: "Sonstiges",
};

export const GROUP_CATEGORIES: GroupCategory[] = [
  "nachbarschaft",
  "sport",
  "garten",
  "kinder",
  "senioren",
  "kultur",
  "ehrenamt",
  "sonstiges",
];

export type GroupType = "open" | "closed" | "official";

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  open: "Offen",
  closed: "Geschlossen",
  official: "Offiziell",
};

export type GroupMemberRole = "founder" | "admin" | "member";
export type GroupMemberStatus = "active" | "pending" | "removed";

// DB-Interfaces
export interface Group {
  id: string;
  quarter_id: string;
  name: string;
  description: string | null;
  category: GroupCategory;
  type: GroupType;
  creator_id: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupWithMembership extends Group {
  my_membership?: GroupMember | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joined_at: string;
}

export interface GroupMemberWithUser extends GroupMember {
  users?: { display_name: string | null; avatar_url: string | null } | null;
}

export interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  users?: { display_name: string | null; avatar_url: string | null } | null;
  comment_count?: number;
}

export interface GroupPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { display_name: string | null; avatar_url: string | null } | null;
}

// API Payloads
export interface CreateGroupPayload {
  name: string;
  description?: string;
  category: GroupCategory;
  type?: GroupType;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  category?: GroupCategory;
  type?: GroupType;
}

export interface CreatePostPayload {
  content: string;
  image_url?: string;
}
