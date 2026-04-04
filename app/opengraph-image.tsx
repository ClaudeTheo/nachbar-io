// OG-Image Route — Next.js generiert automatisch /opengraph-image als PNG
// Wird von Social-Media-Plattformen (Facebook, Twitter, WhatsApp) gecrawlt
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "QuartierApp — Ihr digitaler Dorfplatz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Hero-Bild als Hintergrund laden
  const heroBuffer = await readFile(
    join(process.cwd(), "public/images/og-hero-bg.jpg"),
  );
  const heroSrc = `data:image/jpeg;base64,${heroBuffer.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
      }}
    >
      {/* Hero-Bild als Hintergrund */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroSrc}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Dunkler Gradient-Overlay fuer Lesbarkeit */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(45,49,66,0.92) 0%, rgba(45,49,66,0.75) 50%, rgba(45,49,66,0.6) 100%)",
          display: "flex",
        }}
      />

      {/* Inhalt */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        {/* Oberer Gruener Streifen */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "6px",
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
              width: "100px",
              height: "100px",
              borderRadius: "20px",
              backgroundColor: "#4CAF87",
              color: "white",
              fontSize: "64px",
              fontWeight: 800,
            }}
          >
            Q
          </div>
          <span
            style={{
              fontSize: "52px",
              fontWeight: 700,
              color: "white",
            }}
          >
            uartierApp
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: "32px",
            fontSize: "38px",
            fontWeight: 600,
            color: "#4CAF87",
          }}
        >
          Ihr digitaler Dorfplatz
        </div>

        {/* Beschreibung */}
        <div
          style={{
            marginTop: "20px",
            fontSize: "24px",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Nachbarschaftshilfe · Lokale Infos · Quartiersleben
        </div>

        {/* Pilot-Badge */}
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(76,175,135,0.2)",
              border: "1px solid rgba(76,175,135,0.4)",
              borderRadius: "20px",
              padding: "8px 20px",
              fontSize: "18px",
              color: "#4CAF87",
              fontWeight: 500,
            }}
          >
            Pilot: Bad Säckingen — Kostenlos testen
          </div>
        </div>

        {/* Unterer Gruener Streifen */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "6px",
            backgroundColor: "#4CAF87",
          }}
        />
      </div>
    </div>,
    { ...size },
  );
}
