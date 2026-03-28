// Typen fuer den Registrierungs-Flow
import type { AddressSuggestion } from "@/lib/geo/photon-client";

// Schritt-Typen fuer den 2-Schritt-Flow
export type Step = "entry" | "invite_code" | "address" | "identity" | "magic_link_sent";

// Gemeinsamer Form-State fuer alle Schritte
export interface RegisterFormState {
  email: string;
  displayName: string;
  inviteCode: string;
  householdId: string | null;
  referrerId: string | null;
  verificationMethod: string;
  selectedAddress: AddressSuggestion | null;
  houseNumber: string;
  postalCode: string;
  city: string;
  geoQuarter: { quarter_id: string; quarter_name: string; action: string } | null;
  loading: boolean;
  geoLoading: boolean;
  error: string | null;
}

// Props fuer Step-Komponenten
export interface StepProps {
  state: RegisterFormState;
  setState: (updater: Partial<RegisterFormState> | ((prev: RegisterFormState) => Partial<RegisterFormState>)) => void;
  setStep: (step: Step) => void;
}
