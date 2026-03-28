"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="de">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#FAFAF8",
          color: "#2D3142",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1
            style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}
          >
            Ein unerwarteter Fehler ist aufgetreten
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#9CA3AF",
              marginBottom: "24px",
              maxWidth: "320px",
            }}
          >
            Bitte laden Sie die Seite neu. Falls das Problem bestehen bleibt,
            kontaktieren Sie Ihren Quartiers-Admin.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              backgroundColor: "#4CAF87",
              color: "white",
              border: "none",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Seite neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
