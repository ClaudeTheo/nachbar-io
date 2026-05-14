export type FamilySetupFlowType =
  | "child_direct"
  | "child_friend"
  | "senior_setup";

export type FamilySetupStatus =
  | "pending_parent_approval"
  | "ready"
  | "claimed"
  | "expired"
  | "revoked"
  | "needs_admin_review";

export type FamilySetupUiMode = "youth" | "senior" | "comfort";

export type ChildRelationshipType = "parent" | "guardian" | "other";

export type SeniorRelationshipType =
  | "partner"
  | "child"
  | "grandchild"
  | "friend"
  | "volunteer"
  | "other";

export interface ClaimableInvitation {
  status: FamilySetupStatus;
  used_at: string | null;
  expires_at: string;
}
