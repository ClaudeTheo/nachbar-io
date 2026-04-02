// Nachbar.io — Test-Konfiguration & Testdaten
import type { AgentCredentials, TestHousehold } from "./types";

/** Test-Umgebungs-Prefix (verhindert Konflikte mit echten Daten) */
export const TEST_PREFIX = "e2e_test_";
export const TEST_DOMAIN = "test.nachbar.local";

/** Deterministische UUIDs fuer Test-Haushalte (DB erwartet uuid, keine Strings) */
// WICHTIG: Strassen-/Hausnummern duerfen NICHT mit echten Pilot-Daten kollidieren!
// Deshalb "E2E-Testweg" statt "Purkersdorfer Straße" (unique constraint: street_name+house_number)
export const TEST_HOUSEHOLDS: TestHousehold[] = [
  {
    id: "00000000-e2e0-4000-a001-000000000001",
    streetName: "E2E-Testweg",
    houseNumber: "1",
    inviteCode: "TEST0001",
    lat: 47.5535,
    lng: 7.964,
  },
  {
    id: "00000000-e2e0-4000-a001-000000000002",
    streetName: "E2E-Testweg",
    houseNumber: "3",
    inviteCode: "TEST0002",
    lat: 47.5536,
    lng: 7.9642,
  },
  {
    id: "00000000-e2e0-4000-a001-000000000003",
    streetName: "E2E-Testweg",
    houseNumber: "5",
    inviteCode: "TEST0003",
    lat: 47.5537,
    lng: 7.9645,
  },
  {
    id: "00000000-e2e0-4000-a001-000000000004",
    streetName: "E2E-Testweg",
    houseNumber: "12",
    inviteCode: "TEST0004",
    lat: 47.554,
    lng: 7.965,
  },
];

/** Test-Agenten mit vordefinierten Credentials */
export const TEST_AGENTS: Record<string, AgentCredentials> = {
  // Agent A: Normaler Nachbar (Purkersdorfer 1)
  nachbar_a: {
    email: `agent_a@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Anna T.",
    inviteCode: "TEST0001",
    uiMode: "active",
    role: "nachbar",
  },

  // Agent B: Helfer (Purkersdorfer 3)
  helfer_b: {
    email: `agent_b@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Bernd M.",
    inviteCode: "TEST0002",
    uiMode: "active",
    role: "helfer",
  },

  // Agent M: Moderator/Admin (Sanarystraße 5)
  moderator_m: {
    email: `agent_m@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Moderator Max",
    inviteCode: "TEST0003",
    uiMode: "active",
    role: "moderator",
    isAdmin: true,
  },

  // Agent S: Senior (Oberer Rebberg 12)
  senior_s: {
    email: `agent_s@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Gertrude H.",
    inviteCode: "TEST0004",
    uiMode: "senior",
    role: "senior",
  },

  // Agent T: Betreuer (gleicher Haushalt wie Senior)
  betreuer_t: {
    email: `agent_t@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Tanja P.",
    inviteCode: "TEST0004",
    uiMode: "active",
    role: "betreuer",
  },

  // Agent X: Nicht verifiziert (kein gueltiger Invite-Code)
  unverified_x: {
    email: `agent_x@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Xaver U.",
    inviteCode: "INVALID1",
    uiMode: "active",
    role: "unverified",
  },

  // Agent K: Stadt/Kommune — Org-Admin (Pro Community)
  stadt_k: {
    email: `agent_k@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Klara S.",
    inviteCode: "TEST0003",
    uiMode: "active",
    role: "org_admin",
  },

  // Agent D: Arzt — Doctor (Pro Medical) + gleichzeitig Bewohner
  arzt_d: {
    email: `agent_d@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Dr. Daniel F.",
    inviteCode: "TEST0002",
    uiMode: "active",
    role: "doctor",
  },

  // Agent P: Pflegedienst — Org-Admin mit Pflege-Kontext (Pro Community, Pflege-Typ)
  pflege_p: {
    email: `agent_p@${TEST_DOMAIN}`,
    password: "TestPass123!",
    displayName: "Petra K.",
    inviteCode: "TEST0003",
    uiMode: "active",
    role: "org_admin", // Pflege nutzt org_admin-Rolle mit eigenem Organisations-Typ
  },
};

/** Test-Mode Header: Wenn gesetzt, ueberspringt Supabase echte Auth */
export const TEST_MODE_HEADER = "X-Nachbar-Test-Mode";
export const TEST_MODE_SECRET =
  process.env.E2E_TEST_SECRET || "e2e-test-secret-dev";

/** Timeouts fuer Tests */
export const TIMEOUTS = {
  /** Navigation & Seitenlade */
  pageLoad: 15_000,
  /** UI-Element sichtbar */
  elementVisible: 10_000,
  /** Realtime-Event Zustellung */
  realtimeDelivery: 8_000,
  /** Netzwerk-Idle nach Aktion */
  networkIdle: 5_000,
  /** Animation abgeschlossen */
  animationSettle: 1_000,
  /** Toast-Nachricht sichtbar */
  toast: 5_000,
};
