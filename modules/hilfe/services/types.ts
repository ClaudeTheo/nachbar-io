// Nachbar Hilfe — TypeScript-Typen

// DB-Kategorien (englisch, CHECK-Constraint in help_requests)
export type HelpCategory =
  | "garden"
  | "shopping"
  | "transport"
  | "tech"
  | "childcare"
  | "handwork"
  | "pet_care"
  | "tutoring"
  | "company"
  | "other"
  | "package"
  | "noise"
  | "board"
  | "whohas";

// Deutsche Labels fuer die UI
export const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
  shopping: "Einkaufen",
  company: "Begleitung",
  handwork: "Haushalt",
  garden: "Garten",
  tech: "Technik",
  tutoring: "Vorlesen / Formulare",
  transport: "Transport",
  childcare: "Kinderbetreuung",
  pet_care: "Tierpflege",
  package: "Paketannahme",
  noise: "Laermmeldung",
  board: "Schwarzes Brett",
  whohas: "Wer hat...?",
  other: "Sonstiges",
};

// Primaer-Kategorien fuer das Hilfe-Gesuch-Formular (Senioren-Modus, max 7)
export const PRIMARY_HELP_CATEGORIES: HelpCategory[] = [
  "shopping",
  "company",
  "handwork",
  "garden",
  "tech",
  "tutoring",
  "other",
];

export type HelpRequestType = "need" | "offer";
export type HelpRequestStatus = "active" | "matched" | "closed";
export type HelpSessionStatus = "draft" | "signed" | "receipt_created";

export type ResearchStatus = 'checked_official_sources' | 'pending_research';

export interface FederalStateRule {
  state_code: string;
  state_name: string;
  is_available: boolean;
  research_status: ResearchStatus;
  last_checked: string | null;
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
  // Neue Felder aus Pflege-Matrix
  recognition_type: string | null;
  formal_pre_registration: boolean | null;
  hourly_rate_min_cents: number | null;
  hourly_rate_max_cents: number | null;
  hourly_rate_note: string | null;
  reimbursement_principle: string | null;
  direct_payment_possible: boolean | null;
  // Erlaubte Taetigkeiten
  allowed_household: boolean | null;
  allowed_cleaning: boolean | null;
  allowed_shopping: boolean | null;
  allowed_escort: boolean | null;
  allowed_leisure: boolean | null;
  allowed_snow_removal: boolean | null;
  allowed_lawn_mowing: boolean | null;
  // Hinweise
  insurance_note: string | null;
  tax_note: string | null;
  primary_official_url: string | null;
  secondary_official_url: string | null;
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
  type: HelpRequestType;
  category: HelpCategory;
  title: string;
  description: string | null;
  subcategory: string | null;
  quarter_id: string | null;
  image_url: string | null;
  status: HelpRequestStatus;
  expires_at: string | null;
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
