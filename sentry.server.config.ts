// Sentry Server-Side Konfiguration
// Laeuft in Node.js — erfasst API-Route-Fehler, SSR-Crashes
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: 10% der Server-Requests
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Nur in Production senden
  enabled: process.env.NODE_ENV === "production",

  // Sensible Daten filtern (DSGVO)
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    return event;
  },

  release: `nachbar-io@${process.env.NEXT_PUBLIC_APP_VERSION || "unknown"}`,
  environment: process.env.NODE_ENV,
});
