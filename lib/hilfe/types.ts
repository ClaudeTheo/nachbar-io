// Nachbar Hilfe — TypeScript-Typen

export type HelpCategory =
  | "einkaufen"
  | "begleitung"
  | "haushalt"
  | "garten"
  | "technik"
  | "vorlesen"
  | "sonstiges";

export const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
  einkaufen: "Einkaufen",
  begleitung: "Begleitung",
  haushalt: "Haushalt",
  garten: "Garten",
  technik: "Technik",
  vorlesen: "Vorlesen / Formulare",
  sonstiges: "Sonstiges",
};

export type HelpRequestStatus = "open" | "matched" | "completed" | "cancelled";
export type HelpSessionStatus = "draft" | "signed" | "receipt_created";

export interface FederalStateRule {
  state_code: string;
  state_name: string;
  is_available: boolean;
  training_required: boolean;
  training_hours: number | null;
  min_age: number;
  max_hourly_rate_cents: number | null;
  max_concurrent_clients: number | null;
  relationship_exclusion_degree: number;
  same_household_excluded: boolean;
  registration_authority: string | null;
  official_form_url: string | null;
  notes: string | null;
}

export interface CareProfileHilfe {
  id: string;
  user_id: string;
  care_level: number;
  insurance_name: string;
  insurance_number_encrypted: string;
  monthly_budget_cents: number;
  created_at: string;
  updated_at: string;
}

export interface NeighborhoodHelper {
  id: string;
  user_id: string;
  federal_state: string;
  date_of_birth: string;
  hourly_rate_cents: number;
  certification_url: string | null;
  verified: boolean;
  relationship_check: boolean;
  household_check: boolean;
  terms_accepted_at: string | null;
  active_client_count: number;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  user_id: string;
  quarter_id: string;
  category: HelpCategory;
  description: string | null;
  preferred_time: string | null;
  status: HelpRequestStatus;
  created_at: string;
}

export interface HelpMatch {
  id: string;
  request_id: string;
  helper_id: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface HelpSession {
  id: string;
  match_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  activity_category: string;
  activity_description: string | null;
  hourly_rate_cents: number;
  total_amount_cents: number;
  helper_signature_url: string | null;
  resident_signature_url: string | null;
  status: HelpSessionStatus;
  created_at: string;
}

export interface HelpReceipt {
  id: string;
  session_id: string;
  pdf_url: string;
  submitted_to_insurer: boolean;
  submitted_at: string | null;
  created_at: string;
}

export interface BudgetSummary {
  monthly_budget_cents: number;
  used_this_month_cents: number;
  available_cents: number;
  carry_over_cents: number;
  sessions_this_month: number;
}

// Phase 2 — Subscription + Verbindungen

export type SubscriptionStatus =
  | "free"
  | "trial"
  | "active"
  | "paused"
  | "cancelled";
export type ConnectionSource = "organic" | "invitation";

export interface HelperConnection {
  id: string;
  helper_id: string;
  resident_id: string;
  source: ConnectionSource;
  invite_code: string | null;
  confirmed_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface HelpMonthlyReport {
  id: string;
  helper_id: string;
  resident_id: string;
  month_year: string;
  pdf_url: string;
  total_sessions: number;
  total_amount_cents: number;
  sent_to_email: string | null;
  sent_at: string | null;
  created_at: string;
}

// Erweiterte NeighborhoodHelper mit Subscription-Feldern
export interface NeighborhoodHelperFull extends NeighborhoodHelper {
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_receipt_used: boolean;
  subscription_paused_at: string | null;
  subscription_cancelled_at: string | null;
}
