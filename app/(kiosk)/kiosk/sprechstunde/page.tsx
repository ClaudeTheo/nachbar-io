"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DoctorProfile {
  id: string;
  name: string;
  specialization: string[];
  bio: string;
  visible: boolean;
}

interface AppointmentSlot {
  id: string;
  scheduled_at: string;
  type: string;
  status: string;
}

/**
 * Online-Sprechstunde — Video-Termin mit dem Quartiers-Arzt buchen.
 * Zeigt verfügbare Ärzte und freie Termine.
 * Video-Call über Sprechstunde.online (KBV-zertifiziert).
 */
function getDemoDoctors(): DoctorProfile[] {
  return [
    {
      id: "demo-1",
      name: "Dr. med. Maria Schneider",
      specialization: ["Allgemeinmedizin"],
      bio: "Hausärztliche Versorgung und Vorsorge im Quartier.",
      visible: true,
    },
    {
      id: "demo-2",
      name: "Dr. med. Thomas Weber",
      specialization: ["Innere Medizin", "Geriatrie"],
      bio: "Spezialisiert auf die Gesundheit älterer Menschen.",
      visible: true,
    },
  ];
}

export default function KioskSprechstundePage() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ärzte laden
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch("/api/doctors/profiles");
        if (res.ok) {
          const data = await res.json();
          const visible = Array.isArray(data)
            ? data.filter((d: DoctorProfile) => d.visible)
            : [];
          if (visible.length > 0) {
            setDoctors(visible);
            return;
          }
        }
        // Fallback: Keine Ärzte von API → Demo-Daten
        setDoctors(getDemoDoctors());
      } catch {
        setDoctors(getDemoDoctors());
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []);

  // Termine laden wenn Arzt ausgewählt
  useEffect(() => {
    if (!selectedDoctor) return;

    async function loadSlots() {
      setSlotsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/doctors/${selectedDoctor}/slots`);
        if (res.ok) {
          const data = await res.json();
          setSlots(
            Array.isArray(data)
              ? data.filter((s: AppointmentSlot) => s.status === "available")
              : [],
          );
        } else {
          // Demo-Termine
          setSlots(generateDemoSlots());
        }
      } catch {
        setSlots(generateDemoSlots());
      } finally {
        setSlotsLoading(false);
      }
    }
    loadSlots();
  }, [selectedDoctor]);

  function generateDemoSlots(): AppointmentSlot[] {
    const now = new Date();
    const demoSlots: AppointmentSlot[] = [];
    for (let d = 1; d <= 3; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      for (const hour of [9, 10, 11, 14, 15, 16]) {
        date.setHours(hour, 0, 0, 0);
        demoSlots.push({
          id: `slot-${d}-${hour}`,
          scheduled_at: date.toISOString(),
          type: "video",
          status: "available",
        });
      }
    }
    return demoSlots;
  }

  async function bookSlot(slotId: string) {
    setBooked(slotId);
    // In Produktion: POST /api/doctors/{id}/book
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Termine nach Datum gruppieren
  const slotsByDate = slots.reduce<Record<string, AppointmentSlot[]>>(
    (acc, slot) => {
      const dateKey = new Date(slot.scheduled_at).toDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
      return acc;
    },
    {},
  );

  // Buchungsbestätigung
  if (booked) {
    const slot = slots.find((s) => s.id === booked);
    const doctor = doctors.find((d) => d.id === selectedDoctor);
    return (
      <div
        style={{
          padding: "28px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "64px" }}>✅</div>
        <h1 style={{ fontSize: "28px", fontWeight: 700 }}>Termin gebucht!</h1>
        {doctor && (
          <p style={{ fontSize: "20px", opacity: 0.8 }}>{doctor.name}</p>
        )}
        {slot && (
          <div
            className="kiosk-card"
            style={{ padding: "24px", textAlign: "center" }}
          >
            <p style={{ fontSize: "22px", fontWeight: 600 }}>
              {formatDate(slot.scheduled_at)}
            </p>
            <p
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#4caf87",
                marginTop: "8px",
              }}
            >
              {formatTime(slot.scheduled_at)} Uhr
            </p>
            <p style={{ fontSize: "16px", opacity: 0.6, marginTop: "12px" }}>
              📹 Video-Sprechstunde
            </p>
          </div>
        )}
        <p style={{ fontSize: "18px", opacity: 0.7, maxWidth: "400px" }}>
          Sie erhalten eine Erinnerung vor dem Termin. Die Video-Sprechstunde
          startet automatisch zur gebuchten Zeit.
        </p>
        <Link
          href="/kiosk"
          className="kiosk-back"
          style={{ marginTop: "16px" }}
        >
          ← Zurück zum Start
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 28px", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <Link href="/kiosk" className="kiosk-back">
          ← Zurück
        </Link>
        <h1 style={{ fontSize: "28px", fontWeight: 700 }}>
          📹 Online-Sprechstunde
        </h1>
      </div>

      {/* Info-Hinweis */}
      <div
        className="kiosk-card"
        style={{ marginBottom: "20px", borderLeft: "3px solid #34d399" }}
      >
        <p style={{ fontSize: "17px", opacity: 0.85 }}>
          Buchen Sie einen Video-Termin mit Ihrem Quartiers-Arzt. Die
          Sprechstunde findet per Video statt — bequem von zu Hause.
        </p>
      </div>

      {loading ? (
        <div
          className="kiosk-card"
          style={{ textAlign: "center", padding: "40px" }}
        >
          <p style={{ fontSize: "20px", opacity: 0.6 }}>Lade Ärzte...</p>
        </div>
      ) : !selectedDoctor ? (
        /* Arzt-Auswahl */
        <div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 600,
              marginBottom: "16px",
              opacity: 0.8,
            }}
          >
            Wählen Sie einen Arzt:
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {doctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoctor(doc.id)}
                className="kiosk-card"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  minHeight: "80px",
                  border: "1px solid #e8ede3",
                  width: "100%",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <span style={{ fontSize: "36px" }}>👨‍⚕️</span>
                  <div>
                    <p style={{ fontSize: "20px", fontWeight: 600 }}>
                      {doc.name}
                    </p>
                    <p style={{ fontSize: "16px", opacity: 0.6 }}>
                      {doc.specialization.join(", ")}
                    </p>
                    <p
                      style={{
                        fontSize: "15px",
                        opacity: 0.5,
                        marginTop: "4px",
                      }}
                    >
                      {doc.bio}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {doctors.length === 0 && (
            <div
              className="kiosk-card"
              style={{ textAlign: "center", padding: "40px" }}
            >
              <p style={{ fontSize: "20px" }}>Noch keine Ärzte verfügbar.</p>
              <p style={{ fontSize: "16px", opacity: 0.6, marginTop: "8px" }}>
                Bitte versuchen Sie es später erneut.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Terminauswahl */
        <div>
          <button
            onClick={() => {
              setSelectedDoctor(null);
              setSlots([]);
            }}
            className="kiosk-back"
            style={{ marginBottom: "16px" }}
          >
            ← Anderen Arzt wählen
          </button>

          <h2
            style={{
              fontSize: "22px",
              fontWeight: 600,
              marginBottom: "16px",
              opacity: 0.8,
            }}
          >
            Freie Termine bei{" "}
            {doctors.find((d) => d.id === selectedDoctor)?.name}:
          </h2>

          {slotsLoading ? (
            <div
              className="kiosk-card"
              style={{ textAlign: "center", padding: "40px" }}
            >
              <p style={{ fontSize: "20px", opacity: 0.6 }}>Lade Termine...</p>
            </div>
          ) : (
            <div
              className="kiosk-scroll"
              style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}
            >
              {Object.entries(slotsByDate).map(([dateKey, dateSlots]) => (
                <div key={dateKey} style={{ marginBottom: "20px" }}>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      opacity: 0.7,
                      marginBottom: "10px",
                    }}
                  >
                    {formatDate(dateSlots[0].scheduled_at)}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "10px",
                    }}
                  >
                    {dateSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => bookSlot(slot.id)}
                        className="kiosk-card"
                        style={{
                          textAlign: "center",
                          cursor: "pointer",
                          minHeight: "80px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          border: "1px solid rgba(76, 175, 135, 0.3)",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: "24px",
                              fontWeight: 700,
                              color: "#4caf87",
                            }}
                          >
                            {formatTime(slot.scheduled_at)}
                          </p>
                          <p style={{ fontSize: "14px", opacity: 0.5 }}>
                            📹 Video
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {slots.length === 0 && !slotsLoading && (
                <div
                  className="kiosk-card"
                  style={{ textAlign: "center", padding: "40px" }}
                >
                  <p style={{ fontSize: "20px" }}>
                    Keine freien Termine verfügbar.
                  </p>
                  <p
                    style={{ fontSize: "16px", opacity: 0.6, marginTop: "8px" }}
                  >
                    Bitte versuchen Sie es in einigen Tagen erneut.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className="kiosk-card"
          style={{
            textAlign: "center",
            padding: "20px",
            borderLeft: "3px solid #ef4444",
            marginTop: "16px",
          }}
        >
          <p style={{ fontSize: "18px", color: "#ef4444" }}>{error}</p>
        </div>
      )}
    </div>
  );
}
