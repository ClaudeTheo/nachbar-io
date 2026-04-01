"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function KioskConfirmContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [status, setStatus] = useState<
    "ready" | "confirming" | "success" | "error"
  >("ready");
  const [errorMsg, setErrorMsg] = useState("");

  // Prüfen ob Session gültig ist
  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg(
        "Kein gültiger QR-Code. Bitte scannen Sie den Code am Kiosk erneut.",
      );
    }
  }, [sessionId]);

  async function handleConfirm() {
    if (!sessionId) return;
    setStatus("confirming");

    try {
      const res = await fetch("/api/kiosk/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "qr_confirm", session_id: sessionId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "confirmed") {
          setStatus("success");
          return;
        }
      }

      if (res.status === 401) {
        setErrorMsg("Bitte melden Sie sich zuerst in der QuartierApp an.");
        setStatus("error");
        return;
      }

      if (res.status === 410) {
        setErrorMsg(
          "Der QR-Code ist abgelaufen. Bitte scannen Sie einen neuen Code am Kiosk.",
        );
        setStatus("error");
        return;
      }

      setErrorMsg("Fehler bei der Bestätigung. Bitte versuchen Sie es erneut.");
      setStatus("error");
    } catch {
      setErrorMsg(
        "Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.",
      );
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        gap: "20px",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#f8faf5",
        color: "#2d3142",
      }}
    >
      {status === "ready" && (
        <>
          <div style={{ fontSize: "64px" }}>🏘️</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Kiosk-Anmeldung</h1>
          <p style={{ fontSize: "16px", color: "#666", maxWidth: "300px" }}>
            Möchten Sie sich am Quartier-Kiosk anmelden? Ihr Konto wird mit dem
            Kiosk-Bildschirm verbunden.
          </p>
          <button
            onClick={handleConfirm}
            style={{
              background: "#4caf87",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "20px",
              fontWeight: 600,
              padding: "16px 40px",
              minHeight: "56px",
              cursor: "pointer",
              width: "100%",
              maxWidth: "300px",
            }}
          >
            ✅ Anmeldung bestätigen
          </button>
          <p style={{ fontSize: "13px", color: "#999" }}>
            Diese Anmeldung gilt nur für den aktuellen Kiosk.
          </p>
        </>
      )}

      {status === "confirming" && (
        <>
          <div style={{ fontSize: "48px" }}>⏳</div>
          <p style={{ fontSize: "18px" }}>Wird bestätigt...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ fontSize: "64px" }}>✅</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#4caf87" }}>
            Erfolgreich!
          </h1>
          <p style={{ fontSize: "16px", color: "#666" }}>
            Der Kiosk ist jetzt mit Ihrem Konto verbunden. Sie können dieses
            Fenster schließen.
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ fontSize: "64px" }}>❌</div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ef4444" }}>
            Fehler
          </h1>
          <p style={{ fontSize: "16px", color: "#666", maxWidth: "300px" }}>
            {errorMsg}
          </p>
          {sessionId && (
            <button
              onClick={() => {
                setStatus("ready");
                setErrorMsg("");
              }}
              style={{
                background: "transparent",
                color: "#4caf87",
                border: "2px solid #4caf87",
                borderRadius: "12px",
                fontSize: "16px",
                padding: "12px 32px",
                cursor: "pointer",
              }}
            >
              Erneut versuchen
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * QR-Code Bestätigungsseite.
 * Wird auf dem HANDY geöffnet wenn der Senior den QR-Code scannt.
 */
export default function KioskConfirmPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8faf5",
            color: "#2d3142",
            fontSize: "18px",
          }}
        >
          Wird geladen...
        </div>
      }
    >
      <KioskConfirmContent />
    </Suspense>
  );
}
