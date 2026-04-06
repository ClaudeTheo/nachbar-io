// Nachbar.io — Zentraler Service-Error fuer einheitliches Error-Handling
// Routes fangen ServiceError und geben passende HTTP-Responses zurueck.
// Bei 403/404 auf parametrisierten Routes: automatische IDOR-Detection

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * Hilfsfunktion fuer Routes — faengt ServiceError und gibt passende HTTP-Response.
 * Optional: IDOR-Detection bei 403/404 wenn request + routePattern uebergeben werden.
 */
export function handleServiceError(
  error: unknown,
  request?: NextRequest,
  routePattern?: string,
): NextResponse {
  if (error instanceof ServiceError) {
    // IDOR-Detection: Bei 403/404 auf parametrisierten Routes (fire-and-forget)
    if (
      request &&
      routePattern &&
      (error.status === 403 || error.status === 404)
    ) {
      triggerIdorDetection(request, routePattern);
    }
    return NextResponse.json(
      { error: error.message, ...error.data },
      { status: error.status },
    );
  }
  console.error("Unhandled error:", error);
  return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
}

/** Fire-and-forget IDOR-Detection (async, blockiert nicht) */
function triggerIdorDetection(
  request: NextRequest,
  routePattern: string,
): void {
  import("@/lib/security/traps/trap-utils")
    .then(({ buildClientKeysNode }) => {
      const keys = buildClientKeysNode(request);
      return import("@/lib/security/traps/idor-detector").then(
        ({ recordIdorAttempt }) => recordIdorAttempt(keys, routePattern),
      );
    })
    .catch((err) =>
      console.warn("[security] IDOR-Detection fehlgeschlagen:", err),
    );
}
