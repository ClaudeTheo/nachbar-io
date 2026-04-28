// Typen fuer den Registrierungs-Flow
import type { AddressSuggestion } from "@/lib/geo/photon-client";
import type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";
export type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";

// Schritt-Typen fuer den 2-Schritt-Flow
export type Step =
  | "entry"
  | "invite_code"
  | "address"
  | "identity"
  | "pilot_role"
  | "ai_consent"
  | "magic_link_sent";

export type PilotRole = "resident" | "caregiver" | "helper" | "test_user";

// Gemeinsamer Form-State fuer alle Schritte
export interface RegisterFormState {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  inviteCode: string;
  householdId: string | null;
  referrerId: string | null;
  verificationMethod: string;
  selectedAddress: AddressSuggestion | null;
  houseNumber: string;
  postalCode: string;
  city: string;
  geoQuarter: { quarter_id: string; quarter_name: string; action: string } | null;
  pilotRole?: PilotRole;
  aiConsentChoice?: "yes" | "no" | "later";
  aiAssistanceLevel?: AiAssistanceLevel;
  website?: string;
  loading: boolean;
  geoLoading: boolean;
  error: string | null;
}

// Props fuer Step-Komponenten
export interface StepProps {
  state: RegisterFormState;
  setState: (updater: Partial<RegisterFormState> | ((prev: RegisterFormState) => Partial<RegisterFormState>)) => void;
  setStep: (step: Step) => void;
  isPreview?: boolean;
}
