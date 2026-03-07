// Nachbar.io — Datenbank-Typen (manuell, bis supabase gen types verfügbar)

export type UserUiMode = "active" | "senior";
export type TrustLevel = "new" | "verified" | "trusted" | "admin";

export type AlertCategory =
  | "water_damage"
  | "power_outage"
  | "door_lock"
  | "fall"
  | "shopping"
  | "tech_help"
  | "pet"
  | "other";

export type AlertStatus = "open" | "help_coming" | "resolved";

export type HelpRequestType = "need" | "offer";
export type HelpRequestStatus = "active" | "matched" | "closed";

export type MarketplaceType = "sell" | "give" | "search" | "lend";
export type MarketplaceStatus = "active" | "reserved" | "done" | "deleted";

export type LostFoundType = "lost" | "found";

export interface User {
  id: string;
  email_hash: string;
  display_name: string;
  avatar_url: string | null;
  ui_mode: UserUiMode;
  trust_level: TrustLevel;
  is_admin: boolean;
  created_at: string;
  last_seen: string;
  settings: Record<string, unknown>;
}

export interface Household {
  id: string;
  street_name: string;
  house_number: string;
  lat: number;
  lng: number;
  verified: boolean;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "member";
  verified_at: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  household_id: string;
  category: AlertCategory;
  title: string;
  description: string | null;
  status: AlertStatus;
  is_emergency: boolean;
  current_radius: number;
  created_at: string;
  resolved_at: string | null;
  // Joined Felder
  user?: Pick<User, "display_name" | "avatar_url">;
  household?: Pick<Household, "street_name" | "house_number" | "lat" | "lng">;
  responses?: AlertResponse[];
}

export interface AlertResponse {
  id: string;
  alert_id: string;
  responder_user_id: string;
  message: string | null;
  response_type: "help" | "info" | "resolved";
  created_at: string;
  responder?: Pick<User, "display_name" | "avatar_url">;
}

export interface HelpRequest {
  id: string;
  user_id: string;
  type: HelpRequestType;
  category: string;
  title: string;
  description: string | null;
  status: HelpRequestStatus;
  expires_at: string | null;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

export interface MarketplaceItem {
  id: string;
  user_id: string;
  type: MarketplaceType;
  category: string;
  title: string;
  description: string | null;
  price: number | null;
  images: string[];
  status: MarketplaceStatus;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

export interface LostFoundItem {
  id: string;
  user_id: string;
  type: LostFoundType;
  category: string;
  title: string;
  description: string | null;
  location_hint: string | null;
  images: string[];
  status: "open" | "resolved";
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

export interface NewsItem {
  id: string;
  source_url: string | null;
  original_title: string;
  ai_summary: string;
  category: string;
  relevance_score: number;
  published_at: string | null;
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  category: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
  created_at: string;
}
