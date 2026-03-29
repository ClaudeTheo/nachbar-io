// Nachbar.io — Zentraler Service-Error fuer einheitliches Error-Handling
// Routes fangen ServiceError und geben passende HTTP-Responses zurueck.

import { NextResponse } from "next/server";

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

// Hilfsfunktion fuer Routes — faengt ServiceError und gibt passende HTTP-Response
export function handleServiceError(error: unknown): NextResponse {
  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: error.message, ...error.data },
      { status: error.status },
    );
  }
  console.error("Unhandled error:", error);
  return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
}
