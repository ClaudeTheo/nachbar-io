// Nachbar.io — Multi-Agent E2E Test-Typen

/** Verfuegbare Rollen fuer Test-Agenten */
export type AgentRole =
  | "nachbar"       // Normaler Nachbar (verifiziert)
  | "hilfesuchend"  // Person, die Hilfe braucht
  | "helfer"        // Person, die Hilfe anbietet
  | "moderator"     // Admin/Moderator
  | "senior"        // Senior im einfachen Modus
  | "betreuer"      // Betreuer des Seniors
  | "org_admin"     // Kommunaler Org-Admin (Pro Community)
  | "doctor"        // Arzt (Pro Medical) — gleichzeitig Bewohner
  | "unverified"    // Nicht verifiziert (kein Invite-Code)
  | "guest";        // Nicht eingeloggt

/** Credentials fuer einen Test-Agenten */
export interface AgentCredentials {
  email: string;
  password: string;
  displayName: string;
  inviteCode: string;
  householdId?: string;
  uiMode: "active" | "senior";
  role: AgentRole;
  isAdmin?: boolean;
}

/** Test-Household fuer Seeding */
export interface TestHousehold {
  id: string;
  streetName: string;
  houseNumber: string;
  inviteCode: string;
  lat: number;
  lng: number;
}

/** Ergebnis eines Szenarios */
export interface ScenarioResult {
  name: string;
  passed: boolean;
  duration: number;
  errors: string[];
  screenshots: string[];
}

/** Observer-Event Typen */
export type ObserverEventType =
  | "notification"
  | "message"
  | "feed_update"
  | "status_change"
  | "alert"
  | "help_request"
  | "moderation";

/** Observer-Event */
export interface ObserverEvent {
  type: ObserverEventType;
  agentId: string;
  timestamp: number;
  data: Record<string, unknown>;
}
