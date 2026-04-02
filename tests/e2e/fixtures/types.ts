// Nachbar.io — Page Object Models fuer rollenbasierte E2E-Tests
// Jede Klasse kapselt die wichtigsten UI-Elemente einer Rolle als typisierte Getter.
import type { Page } from '@playwright/test';

/** Page Object fuer den Bewohner (Nachbar Free, Senior-Modus) */
export class ResidentPage {
  constructor(public page: Page) {}

  /** SOS/Notruf-Button im Dashboard oder SOS-Screen */
  get sosButton() { return this.page.getByRole('button', { name: /SOS|Notruf/ }); }

  /** Aktives Check-in-Element */
  get checkinButton() { return this.page.getByTestId('checkin-button'); }

  /** Stimmungsauswahl: Gut */
  get moodGood() { return this.page.getByTestId('mood-good'); }

  /** Stimmungsauswahl: Geht so */
  get moodNeutral() { return this.page.getByTestId('mood-neutral'); }

  /** Stimmungsauswahl: Schlecht */
  get moodBad() { return this.page.getByTestId('mood-bad'); }

  /** Feed-Eintraege im Quartiers-Feed */
  get feedItems() { return this.page.locator("[data-testid='feed-item']"); }

  /** Benachrichtigungs-Eintraege */
  get notifications() { return this.page.locator("[data-testid='notification-item']"); }
}

/** Page Object fuer den Angehoerigen/Betreuer (Nachbar Plus) */
export class CaregiverPage {
  constructor(public page: Page) {}

  /** Heartbeat-Status-Anzeige des betreuten Bewohners */
  get heartbeatStatus() { return this.page.getByTestId('heartbeat-status'); }

  /** Zeitpunkt des letzten Heartbeats */
  get lastHeartbeat() { return this.page.getByTestId('last-heartbeat'); }

  /** Eskalations-Alert-Banner */
  get alertBanner() { return this.page.getByRole('alert'); }

  /** Liste der betreuten Personen */
  get patientList() { return this.page.getByTestId('patient-list'); }
}

/** Page Object fuer den Arzt (Nachbar Pro Medical) */
export class ArztPage {
  constructor(public page: Page) {}

  /** Terminliste des Arztes */
  get appointmentList() { return this.page.getByTestId('appointment-list'); }

  /** Patienten-Uebersicht */
  get patientOverview() { return this.page.getByTestId('patient-overview'); }

  /** Eingehende Konsultationsanfragen */
  get consultationRequests() { return this.page.getByTestId('consultation-requests'); }
}

/** Page Object fuer den Pflegedienst (nachbar-pflege, Org-Admin Pflege-Typ) */
export class PflegePage {
  constructor(public page: Page) {}

  /** Alert-Dashboard (Eskalationen, Ausfaelle) */
  get alertDashboard() { return this.page.getByTestId('alert-dashboard'); }

  /** Medikamentenplaene der betreuten Personen */
  get medicationPlans() { return this.page.getByTestId('medication-plans'); }

  /** Team-Chat des Pflegedienstes */
  get teamChat() { return this.page.getByTestId('team-chat'); }
}

/** Page Object fuer den kommunalen Org-Admin (Nachbar Pro Community) */
export class OrgAdminPage {
  constructor(public page: Page) {}

  /** Organisations-Dashboard */
  get dashboard() { return this.page.getByTestId('org-dashboard'); }

  /** Ankuendigungen im Quartier */
  get announcements() { return this.page.getByTestId('announcements'); }

  /** Audit-Log administrativer Aktionen */
  get auditLog() { return this.page.getByTestId('audit-log'); }

  /** Eskalations-Ereignisse */
  get escalations() { return this.page.getByTestId('escalation-events'); }
}
