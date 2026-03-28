// Sentry Client-Side Konfiguration
// Laeuft im Browser — erfasst unbehandelte Fehler, Performance-Daten
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring: 10% der Requests im Production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay: 1% normal, 100% bei Fehlern
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Nur in Production senden
  enabled: process.env.NODE_ENV === "production",

  // Sensible Daten filtern (DSGVO)
  beforeSend(event) {
    // Keine PII in Sentry — E-Mail/Name aus User-Context entfernen
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    return event;
  },

  // App-Version fuer Release-Tracking
  release: `nachbar-io@${process.env.NEXT_PUBLIC_APP_VERSION || "unknown"}`,
  environment: process.env.NODE_ENV,
});
