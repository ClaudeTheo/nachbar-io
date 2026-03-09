// Nachbar.io — Datenbank-Typen (manuell, bis supabase gen types verfügbar)

export type UserUiMode = "active" | "senior";
export type TrustLevel = "new" | "verified" | "trusted" | "admin";

export type AlertCategory =
  | "fire"
  | "medical"
  | "crime"
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
  subcategory: string | null;
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

// Phase 2: Veranstaltungskalender
export type EventCategory =
  | "community"
  | "sports"
  | "culture"
  | "market"
  | "kids"
  | "seniors"
  | "cleanup"
  | "other";

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  category: EventCategory;
  max_participants: number | null;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
  participant_count?: number;
  my_status?: "going" | "interested" | "cancelled" | null;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: "going" | "interested" | "cancelled";
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

// Phase 2: Direktnachrichten
export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_user?: Pick<User, "display_name" | "avatar_url">;
  last_message?: string;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: Pick<User, "display_name" | "avatar_url">;
}

// Phase 2: Verifizierte lokale Experten
export interface ExpertReview {
  id: string;
  expert_user_id: string;
  reviewer_user_id: string;
  skill_category: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
  reviewer?: Pick<User, "display_name" | "avatar_url">;
}

export interface ExpertEndorsement {
  id: string;
  expert_user_id: string;
  endorser_user_id: string;
  skill_category: string;
  created_at: string;
  endorser?: Pick<User, "display_name" | "avatar_url">;
}

// Nachbarschafts-Tipps (kooperative Empfehlungen, KEIN Social Media)
export type TipStatus = "active" | "archived" | "reported";

export interface CommunityTip {
  id: string;
  user_id: string;
  category: string;
  title: string;
  business_name: string | null;
  description: string;
  location_hint: string | null;
  contact_hint: string | null;
  confirmation_count: number;
  status: TipStatus;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
  my_confirmation?: boolean;
}

export interface TipConfirmation {
  id: string;
  tip_id: string;
  user_id: string;
  created_at: string;
}

// Karten-Konfiguration (Admin Map Editor)
export type MapHouseStreetCode = "PS" | "SN" | "OR";
export type MapHouseColor = "green" | "red" | "yellow";

export interface MapHouse {
  id: string;
  house_number: string;
  street_code: MapHouseStreetCode;
  x: number;
  y: number;
  default_color: MapHouseColor;
  created_at: string;
  updated_at: string;
}

// Nachbar-Verbindungen
export type NeighborConnectionStatus = "pending" | "accepted" | "declined";

export interface NeighborConnection {
  id: string;
  requester_id: string;
  target_id: string;
  status: NeighborConnectionStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  requester?: Pick<User, "display_name" | "avatar_url">;
  target?: Pick<User, "display_name" | "avatar_url">;
}

// Urlaub-Modus
export interface VacationMode {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  notify_neighbors: boolean;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

// Leihboerse
export type LeihboerseType = "lend" | "borrow";
export type LeihboerseStatus = "active" | "reserved" | "done";

export interface LeihboerseItem {
  id: string;
  user_id: string;
  type: LeihboerseType;
  category: string;
  title: string;
  description: string | null;
  image_url: string | null;
  deposit: string | null;
  available_until: string | null;
  status: LeihboerseStatus;
  reserved_by: string | null;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

// Umfragen
export interface Poll {
  id: string;
  user_id: string;
  question: string;
  multiple_choice: boolean;
  closes_at: string | null;
  status: "active" | "closed";
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
  options?: PollOption[];
  vote_count?: number;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
  vote_count?: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

// Paketannahme
export interface Paketannahme {
  id: string;
  user_id: string;
  available_date: string;
  available_from: string | null;
  available_until: string | null;
  note: string | null;
  created_at: string;
  user?: Pick<User, "display_name" | "avatar_url">;
}

// Reputationssystem (berechnet aus Interaktionsdaten)
export interface ReputationStats {
  points: number;
  level: number;
  levelName: string;
  alertsHelped: number;
  helpActionsCompleted: number;
  itemsShared: number;
  eventsAttended: number;
  endorsementsReceived: number;
  reviewsReceived: number;
  badges: string[];
  lastComputed: string;
}

// Experten-Profil (aggregiert aus skills + reviews + endorsements)
export interface ExpertProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  trust_level: TrustLevel;
  created_at: string;
  skills: Skill[];
  avg_rating: number | null;
  review_count: number;
  endorsement_count: number;
}
