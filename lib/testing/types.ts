// lib/testing/types.ts
// Nachbar.io — Typdefinitionen fuer das Pilot-QA-Testsystem

// ============================================================
// Testpunkt-Status und Klassifikation
// ============================================================

/** Moegliche Status eines Testpunkts */
export type TestStatus = 'open' | 'passed' | 'partial' | 'failed' | 'skipped';

/** Schweregrad eines gefundenen Problems */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Art des gefundenen Problems */
export type IssueType = 'ui' | 'ux' | 'functional' | 'performance' | 'security' | 'text' | 'accessibility';

/** Testmodus: solo, pair (zwei Tester noetig), admin_only */
export type TestMode = 'solo' | 'pair' | 'admin_only';

/** Session-Status */
export type SessionStatus = 'active' | 'completed' | 'abandoned';

// ============================================================
// Testpunkt-Konfiguration (statisch, versioniert)
// ============================================================

/** Ein einzelner Testpunkt */
export interface TestPoint {
  id: string;                    // z.B. "A1", "G5"
  title: string;                 // Kurzbeschreibung
  description: string;           // Detaillierte Pruefanweisung
  route: string;                 // Zugehoerige App-Route
  mode: TestMode;                // solo | pair | admin_only
  estimatedMinutes?: number;     // Geschaetzte Dauer in Minuten
  version: string;               // z.B. "1.0" — fuer Konfigurationsaenderungen
  active: boolean;               // Kann deaktiviert werden ohne Loeschen
  tags?: string[];               // z.B. ["critical", "dsgvo", "senior"]
  partnerInstructions?: string;  // Anweisungen fuer den Testpartner (bei pair)
}

/** Ein Testpfad = Gruppe von Testpunkten */
export interface TestPath {
  id: string;                    // z.B. "registration", "community"
  name: string;                  // Anzeigename
  icon: string;                  // Lucide Icon Name
  description: string;           // Kurzbeschreibung des Pfads
  estimatedMinutes: number;      // Geschaetzte Gesamtdauer
  order: number;                 // Sortierreihenfolge
  points: TestPoint[];           // Testpunkte in diesem Pfad
}

// ============================================================
// Datenbank-Modelle (Supabase-Rows)
// ============================================================

/** test_sessions Zeile */
export interface TestSession {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
  app_version: string | null;
  device_type: string | null;
  browser_info: string | null;
  started_from_route: string | null;
  test_run_label: string | null;
  final_feedback: string | null;
  usability_rating: number | null;
  confidence_rating: number | null;
  summary: SessionSummary;
  created_at: string;
}

/** test_results Zeile */
export interface TestResult {
  id: string;
  session_id: string;
  test_point_id: string;
  status: TestStatus;
  comment: string | null;
  severity: IssueSeverity | null;
  issue_type: IssueType | null;
  screenshot_url: string | null;
  duration_seconds: number | null;
  updated_at: string;
  created_at: string;
}

/** Aggregierte Zusammenfassung einer Session */
export interface SessionSummary {
  total: number;
  passed: number;
  partial: number;
  failed: number;
  skipped: number;
  open: number;
  progressPercent: number;
  durationMinutes?: number;
  failedPoints?: { id: string; comment: string | null; severity: IssueSeverity | null }[];
}

// ============================================================
// UI-State Typen
// ============================================================

/** Globaler Test-Modus State */
export interface TestModeState {
  isTester: boolean;
  isLoading: boolean;
  session: TestSession | null;
  results: Map<string, TestResult>;  // Key = test_point_id
  activePathId: string | null;
  panelOpen: boolean;
  onboardingComplete: boolean;
}

/** Abschluss-Feedback Formular */
export interface SessionFeedback {
  final_feedback: string;
  usability_rating: number;     // 1-5
  confidence_rating: number;    // 1-5
}

// ============================================================
// API Request/Response Typen
// ============================================================

/** POST /api/testing/session Body */
export interface CreateSessionRequest {
  app_version?: string;
  device_type?: string;
  browser_info?: string;
  started_from_route?: string;
  test_run_label?: string;
}

/** POST /api/testing/result Body */
export interface SaveResultRequest {
  test_point_id: string;
  status: TestStatus;
  comment?: string;
  severity?: IssueSeverity;
  issue_type?: IssueType;
  screenshot_url?: string;
  duration_seconds?: number;
}

/** PATCH /api/testing/result Body */
export interface UpdateResultRequest {
  result_id: string;
  status?: TestStatus;
  comment?: string;
  severity?: IssueSeverity;
  issue_type?: IssueType;
  screenshot_url?: string;
  duration_seconds?: number;
}

/** Admin-Uebersicht Tester-Zeile */
export interface TesterOverview {
  user_id: string;
  display_name: string;
  email: string;
  session_id: string | null;
  session_status: SessionStatus | null;
  started_at: string | null;
  completed_at: string | null;
  total: number;
  passed: number;
  partial: number;
  failed: number;
  skipped: number;
  open: number;
  progressPercent: number;
  usability_rating: number | null;
  confidence_rating: number | null;
}
