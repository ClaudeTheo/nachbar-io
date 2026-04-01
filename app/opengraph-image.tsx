// OG-Image Route — Next.js generiert automatisch /opengraph-image als PNG
// Wird von Social-Media-Plattformen (Facebook, Twitter, WhatsApp) gecrawlt
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "QuartierApp — Ihr digitaler Dorfplatz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#2D3142",
        padding: "80px",
        position: "relative",
      }}
    >
      {/* Oberer Grüner Streifen */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "8px",
          backgroundColor: "#4CAF87",
        }}
      />

      {/* Logo + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "120px",
            height: "120px",
            borderRadius: "24px",
            backgroundColor: "#4CAF87",
            color: "white",
            fontSize: "80px",
            fontWeight: 800,
          }}
        >
          N
        </div>
        <span
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "white",
          }}
        >
          achbar.io
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: "40px",
          fontSize: "40px",
          fontWeight: 600,
          color: "#4CAF87",
        }}
      >
        Ihr digitaler Dorfplatz
      </div>

      {/* Beschreibung */}
      <div
        style={{
          marginTop: "24px",
          fontSize: "26px",
          color: "#9CA3AF",
        }}
      >
        Nachbarschaftshilfe · Lokale Infos · Quartiersleben
      </div>

      <div
        style={{
          marginTop: "16px",
          fontSize: "26px",
          color: "#9CA3AF",
        }}
      >
        Pilot: Bad Säckingen
      </div>

      {/* Unterer Grüner Streifen */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "8px",
          backgroundColor: "#4CAF87",
        }}
      />
    </div>,
    { ...size },
  );
}
