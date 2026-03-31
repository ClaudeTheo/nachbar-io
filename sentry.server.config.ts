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
    // UUID-Muster fuer Breadcrumb-URLs (z.B. User-IDs in Pfaden)
    const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    // E-Mail-Muster in Fehlermeldungen
    const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    // Telefonnummern (international + deutsch)
    const PHONE_PATTERN = /(\+?\d{1,4}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,10}[\s-]?\d{0,8}/g;
    // Sensible Query-Parameter (Token, E-Mail, Passwort, Session etc.)
    const SENSITIVE_PARAMS = /([?&])(token|email|password|passwort|session|access_token|refresh_token|api_key|secret|code)=[^&]*/gi;

    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }

    // Breadcrumb-URLs: UUIDs und sensible Query-Parameter entfernen
    if (event.breadcrumbs) {
      for (const crumb of event.breadcrumbs) {
        if (crumb.data?.url) {
          crumb.data.url = crumb.data.url
            .replace(UUID_PATTERN, '[REDACTED-ID]')
            .replace(SENSITIVE_PARAMS, '$1$2=[REDACTED]');
        }
        if (crumb.message) {
          crumb.message = crumb.message
            .replace(UUID_PATTERN, '[REDACTED-ID]')
            .replace(EMAIL_PATTERN, '[REDACTED-EMAIL]')
            .replace(PHONE_PATTERN, '[REDACTED-PHONE]');
        }
      }
    }

    // Fehlermeldungen: E-Mail- und Telefonnummern-Muster entfernen
    if (event.exception?.values) {
      for (const exc of event.exception.values) {
        if (exc.value) {
          exc.value = exc.value
            .replace(EMAIL_PATTERN, '[REDACTED-EMAIL]')
            .replace(PHONE_PATTERN, '[REDACTED-PHONE]');
        }
      }
    }

    // Request-URL: Sensible Query-Parameter entfernen
    if (event.request?.url) {
      event.request.url = event.request.url
        .replace(UUID_PATTERN, '[REDACTED-ID]')
        .replace(SENSITIVE_PARAMS, '$1$2=[REDACTED]');
    }
    if (event.request?.query_string) {
      event.request.query_string = event.request.query_string
        .replace(SENSITIVE_PARAMS, '$1$2=[REDACTED]');
    }

    return event;
  },

  release: `nachbar-io@${process.env.NEXT_PUBLIC_APP_VERSION || "unknown"}`,
  environment: process.env.NODE_ENV,
});
