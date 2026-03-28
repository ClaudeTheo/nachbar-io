// Sentry Edge-Runtime Konfiguration
// Laeuft in Middleware + Edge Functions
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  enabled: process.env.NODE_ENV === "production",

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
