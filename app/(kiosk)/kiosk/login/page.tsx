"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";

type LoginMethod = "qr" | "pin";

/**
 * Kiosk-Login: 3 Wege sich anzumelden
 * 1. QR-Code scannen mit dem Handy (QuartierApp öffnen → bestätigen)
 * 2. 4-stellige PIN eingeben (für Senioren ohne Smartphone)
 * 3. Als Gast fortfahren (eingeschränkte Funktionen)
 */
export default function KioskLoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>("qr");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // QR-Session erstellen
  const createSession = useCallback(async () => {
    try {
      const res = await fetch("/api/kiosk/login?action=create_session");
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
        setQrUrl(data.qr_url);
      }
    } catch {
      // Fallback: Demo-QR
      setSessionId("demo");
      setQrUrl(window.location.origin + "/kiosk/confirm?session=demo");
    }
  }, []);

  // Session erstellen beim Mount
  useEffect(() => {
    createSession();
  }, [createSession]);

  // QR-Code polling — alle 2 Sekunden prüfen ob Handy bestätigt hat
  useEffect(() => {
    if (method !== "qr" || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/kiosk/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "qr_poll", session_id: sessionId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "confirmed") {
            clearInterval(interval);
            setUserName(data.display_name || "Bewohner");
            // User-ID im localStorage speichern (für KI-Budget pro Nutzer)
            if (data.user_id) localStorage.setItem("kiosk_user_id", data.user_id);
            // Kurz Erfolg zeigen, dann weiterleiten
            setTimeout(() => router.push("/kiosk"), 1500);
          } else if (data.status === "expired") {
            // Session erneuern
            createSession();
          }
        }
      } catch {
        /* Stille Fehlerbehandlung */
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [method, sessionId, router, createSession]);

  // QR-Code alle 4 Minuten erneuern (vor 5min Ablauf)
  useEffect(() => {
    const refresh = setInterval(createSession, 4 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [createSession]);

  // PIN eingeben
  function addDigit(d: string) {
    if (pin.length >= 4) return;
    setPinError(false);
    const newPin = pin + d;
    setPin(newPin);

    // Bei 4 Ziffern automatisch absenden
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  }

  function deleteDigit() {
    setPin((p) => p.slice(0, -1));
    setPinError(false);
  }

  async function submitPin(pinValue: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/kiosk/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pin", pin: pinValue }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "confirmed") {
          setUserName(data.display_name || "Bewohner");
          // User-ID im localStorage speichern (für KI-Budget pro Nutzer)
          if (data.user_id) localStorage.setItem("kiosk_user_id", data.user_id);
          setTimeout(() => router.push("/kiosk"), 1500);
          return;
        }
      }
      // Falsche PIN
      setPinError(true);
      setTimeout(() => {
        setPin("");
        setPinError(false);
      }, 1000);
    } catch {
      setPinError(true);
      setTimeout(() => {
        setPin("");
        setPinError(false);
      }, 1000);
    } finally {
      setLoading(false);
    }
  }

  // Erfolgsanzeige
  if (userName) {
    return (
      <div className="kiosk-login">
        <div style={{ fontSize: "64px" }}>✅</div>
        <div className="kiosk-login-title">Willkommen, {userName}!</div>
        <div className="kiosk-login-subtitle">Sie werden weitergeleitet...</div>
      </div>
    );
  }

  return (
    <div className="kiosk-login">
      {/* Logo + Titel */}
      <div style={{ fontSize: "48px", marginBottom: "-8px" }}>🏘️</div>
      <div className="kiosk-login-title">Nachbar Kiosk</div>
      <div className="kiosk-login-subtitle">
        Melden Sie sich an, um alle Funktionen zu nutzen
      </div>

      {/* Tab-Auswahl: QR oder PIN */}
      <div className="kiosk-login-tabs">
        <button
          className={`kiosk-login-tab ${method === "qr" ? "active" : ""}`}
          onClick={() => setMethod("qr")}
        >
          📱 QR-Code
        </button>
        <button
          className={`kiosk-login-tab ${method === "pin" ? "active" : ""}`}
          onClick={() => setMethod("pin")}
        >
          🔢 PIN
        </button>
      </div>

      {/* QR-Code Methode */}
      {method === "qr" && (
        <>
          <div className="kiosk-qr-container">
            {qrUrl ? (
              <QRCodeSVG
                value={qrUrl}
                size={200}
                level="M"
                bgColor="white"
                fgColor="#2d3142"
              />
            ) : (
              <div
                style={{
                  width: 200,
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                }}
              >
                Lade...
              </div>
            )}
          </div>
          <div
            className="kiosk-login-subtitle"
            style={{ fontSize: "16px", maxWidth: "380px" }}
          >
            Scannen Sie den QR-Code mit Ihrem Handy.
            <br />
            Öffnen Sie die QuartierApp und bestätigen Sie die Anmeldung.
          </div>
        </>
      )}

      {/* PIN Methode */}
      {method === "pin" && (
        <>
          {/* PIN-Anzeige (4 Punkte) */}
          <div className="kiosk-pin-display">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`kiosk-pin-dot ${i < pin.length ? (pinError ? "error" : "filled") : ""}`}
              />
            ))}
          </div>

          {pinError && (
            <div
              style={{ color: "#ef4444", fontSize: "16px", marginTop: "-4px" }}
            >
              Falsche PIN — bitte erneut versuchen
            </div>
          )}

          {/* Nummernblock */}
          <div className="kiosk-pin-grid">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                className="kiosk-pin-button"
                onClick={() => addDigit(d)}
                disabled={loading}
              >
                {d}
              </button>
            ))}
            <div /> {/* Leerer Platz */}
            <button
              className="kiosk-pin-button"
              onClick={() => addDigit("0")}
              disabled={loading}
            >
              0
            </button>
            <button
              className="kiosk-pin-button action"
              onClick={deleteDigit}
              disabled={loading}
            >
              ←
            </button>
          </div>

          <div className="kiosk-login-subtitle" style={{ fontSize: "15px" }}>
            Geben Sie Ihre 4-stellige Kiosk-PIN ein
          </div>
        </>
      )}

      {/* Trennlinie */}
      <div className="kiosk-login-divider">
        <span>oder</span>
      </div>

      {/* Gast-Modus */}
      <button
        className="kiosk-guest-button"
        onClick={() => router.push("/kiosk")}
      >
        👤 Als Gast fortfahren
      </button>
      <div
        style={{
          fontSize: "13px",
          color: "#6b7280",
          maxWidth: "350px",
        }}
      >
        Im Gast-Modus sind Radio, Nachrichten, Spiele und Gesundheitstipps
        verfügbar. KI-Begleiter und persönliche Funktionen erfordern eine
        Anmeldung.
      </div>
    </div>
  );
}
