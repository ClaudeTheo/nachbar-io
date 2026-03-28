// Next.js Instrumentation — laedt Sentry serverseitig
// Wird automatisch von Next.js beim Start aufgerufen
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Sentry Error-Handler fuer serverseitige Fehler
export const onRequestError = async (...args: unknown[]) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  // @ts-expect-error — Sentry SDK erwartet spezifische Typen
  return captureRequestError(...args);
};
