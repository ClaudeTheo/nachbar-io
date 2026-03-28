// modules/hilfe/services/index.ts — Barrel Export fuer Hilfe-Services
// Sammelt: Types, Connections, CSV, Email, Feature-Gate, Federal-States, Notifications, PDFs, Stripe

// Typen
export type {
  HelpCategory,
  HelpRequestStatus,
  HelpSessionStatus,
  ResearchStatus,
  FederalStateRule,
  CareProfileHilfe,
  NeighborhoodHelper,
  HelpRequest,
  HelpMatch,
  HelpSession,
  HelpReceipt,
  BudgetSummary,
  SubscriptionStatus,
  ConnectionSource,
  HelperConnection,
  HelpMonthlyReport,
  NeighborhoodHelperFull,
} from "./types";
export { HELP_CATEGORY_LABELS } from "./types";

// Verbindungen
export {
  generateInviteCode,
  isValidInviteCode,
  isInviteCodeExpired,
  checkConnectionLimit,
} from "./connections";

// CSV-Export
export type { HelperCsvRow, ResidentCsvRow } from "./csv-yearly";
export { generateHelperCsv, generateResidentCsv } from "./csv-yearly";

// E-Mail
export {
  getMonthLabel,
  getMonthlyReportSubject,
  sendMonthlyReportEmail,
} from "./email";

// Feature-Gate
export {
  canAccessBilling,
  isTrialExpired,
  getSubscriptionLabel,
  shouldShowPaywall,
} from "./feature-gate";

// Bundesland-Regeln
export {
  getAvailableStates,
  getAllStates,
  getVerifiedStates,
  getStateRules,
  isStateAvailable,
} from "./federal-states";

// Notifications
export type { PushPayload } from "./notifications";
export {
  buildHelpRequestNotification,
  buildMatchNotification,
  buildSignatureReminder,
} from "./notifications";

// PDF-Quittung
export type { ReceiptData } from "./pdf-receipt";
export { formatCents, formatDate, generateReceipt } from "./pdf-receipt";

// PDF Sammelabrechnung
export type {
  MonthlyReportSession,
  MonthlyReportData,
} from "./pdf-monthly-report";
export { generateMonthlyReport } from "./pdf-monthly-report";

// PDF Jahresabrechnung Helfer
export type {
  YearlyHelperSession,
  YearlyHelperClient,
  YearlyHelperData,
} from "./pdf-yearly-helper";
export { generateYearlyHelperReport } from "./pdf-yearly-helper";

// PDF Jahresabrechnung Pflegebeduerftiger
export type {
  YearlyResidentSession,
  YearlyResidentHelper,
  YearlyResidentData,
} from "./pdf-yearly-resident";
export { generateYearlyResidentReport } from "./pdf-yearly-resident";

// Stripe
export {
  HILFE_SUBSCRIPTION_AMOUNT_CENTS,
  getStripe,
  formatEuroCents,
} from "./stripe";
