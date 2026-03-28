"use client";

import { useState } from "react";

// ============================================================
// Apple-Style Transitions Demo — Vorher/Nachher Vergleich
// ============================================================

export default function AppleDemoPage() {
  const [mode, setMode] = useState<"old" | "apple">("apple");
  const [cards, setCards] = useState([1, 2, 3, 4]);
  const [showPage, setShowPage] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  // Alte Animationen (webby)
  const oldStyles = {
    cardActive: "scale(0.97)",
    cardTransition: "transform 0.2s ease",
    pageEnter: "translateX(20px)",
    pageDuration: "250ms",
    pageEase: "ease",
    btnBounce: "scale(0.95)",
    stagger: 50,
    fabPulse: "scale(1.1)",
  };

  // Neue Apple-Animationen
  const appleStyles = {
    cardActive: "translateY(-2px)",
    cardTransition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
    pageEnter: "translateY(8px)",
    pageDuration: "350ms",
    pageEase: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    btnBounce: "opacity: 0.7",
    stagger: 60,
    fabPulse: "box-shadow: 0 0 20px rgba(76,175,135,0.4)",
  };

  const s = mode === "apple" ? appleStyles : oldStyles;

  const triggerPageTransition = () => {
    setShowPage(false);
    setTimeout(() => setShowPage(true), 400);
  };

  return (
    <div
      style={{
        fontFamily: "'Nunito', 'Nunito Sans', -apple-system, sans-serif",
        background: "#FDF8F3",
        minHeight: "100vh",
        maxWidth: 430,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Mode Toggle */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "12px 16px",
          background: "rgba(253,248,243,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(235,229,221,0.5)",
        }}
      >
        {/* iOS Segmented Control */}
        <div
          style={{
            display: "flex",
            background: "rgba(61,61,80,0.06)",
            borderRadius: 9,
            padding: 2,
            position: "relative",
          }}
        >
          <button
            onClick={() => setMode("old")}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 7,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
              background: mode === "old" ? "#fff" : "transparent",
              color: mode === "old" ? "#3D3D50" : "#3D3D5088",
              boxShadow:
                mode === "old"
                  ? "0 1px 3px rgba(61,61,80,0.1), 0 1px 2px rgba(61,61,80,0.06)"
                  : "none",
            }}
          >
            Vorher (Webby)
          </button>
          <button
            onClick={() => setMode("apple")}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: 7,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
              background: mode === "apple" ? "#fff" : "transparent",
              color: mode === "apple" ? "#389568" : "#3D3D5088",
              boxShadow:
                mode === "apple"
                  ? "0 1px 3px rgba(61,61,80,0.1), 0 1px 2px rgba(61,61,80,0.06)"
                  : "none",
            }}
          >
            Nachher (Apple)
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "0 16px",
          opacity: showPage ? 1 : 0,
          transform: showPage ? "translateY(0)" : `${s.pageEnter}`,
          transition: `opacity ${s.pageDuration} ${s.pageEase}, transform ${s.pageDuration} ${s.pageEase}`,
        }}
      >
        {/* Large Title */}
        <div style={{ padding: "8px 0 20px" }}>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#3D3D50",
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Zuhause
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#3D3D5088",
              margin: "4px 0 0",
              fontWeight: 400,
            }}
          >
            Bad Saeckingen, Purkersdorfer Str.
          </p>
        </div>

        {/* Section: Cards mit Stagger */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#3D3D5066",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 12px 4px",
            }}
          >
            Schnellzugriff
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {[
              {
                icon: "📋",
                label: "Brett",
                color: "#3B82F6",
                bg: "linear-gradient(135deg, #3B82F6, #2563EB)",
              },
              {
                icon: "🛒",
                label: "Marktplatz",
                color: "#389568",
                bg: "linear-gradient(135deg, #389568, #2D7A54)",
              },
              {
                icon: "📅",
                label: "Kalender",
                color: "#F59E0B",
                bg: "linear-gradient(135deg, #F59E0B, #D97706)",
              },
              {
                icon: "📍",
                label: "Melden",
                color: "#8B5CF6",
                bg: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              },
            ].map((item, i) => (
              <CardDemo key={item.label} item={item} index={i} mode={mode} />
            ))}
          </div>
        </div>

        {/* Section: Grouped List (iOS Inset Grouped) */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#3D3D5066",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 8px 4px",
            }}
          >
            Aktivitaet
          </h2>

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow:
                mode === "apple"
                  ? "0 1px 3px rgba(61,61,80,0.04), 0 4px 12px rgba(61,61,80,0.03)"
                  : "0 1px 4px rgba(61,61,80,0.04)",
            }}
          >
            {[
              { icon: "👋", text: "Maria hat sich gemeldet", time: "vor 2 Min." },
              { icon: "🛒", text: "Neues Angebot: Gartenmoebel", time: "vor 15 Min." },
              { icon: "📋", text: "Neuer Aushang: Flohmarkt Sa.", time: "vor 1 Std." },
            ].map((item, i, arr) => (
              <ListItemDemo key={i} item={item} isLast={i === arr.length - 1} mode={mode} />
            ))}
          </div>
        </div>

        {/* Button Vergleich */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#3D3D5066",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 12px 4px",
            }}
          >
            Button-Feedback
          </h2>

          <ButtonDemo mode={mode} label="Seiten-Uebergang testen" onClick={triggerPageTransition} />
          <div style={{ height: 10 }} />
          <ButtonDemo mode={mode} label="Nachbar einladen" variant="secondary" />
        </div>

        {/* FAB */}
        <FabDemo mode={mode} />

        <div style={{ height: 100 }} />
      </div>
    </div>
  );
}

// ---- Sub-Components ----

function CardDemo({
  item,
  index,
  mode,
}: {
  item: { icon: string; label: string; color: string; bg: string };
  index: number;
  mode: "old" | "apple";
}) {
  const [pressed, setPressed] = useState(false);

  const staggerDelay = mode === "apple" ? index * 60 : index * 50;

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: item.bg,
        borderRadius: 16,
        padding: "20px 16px",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Animation-Unterschied:
        transform: pressed
          ? mode === "apple"
            ? "translateY(-2px)"
            : "scale(0.97)"
          : "translateY(0)",
        opacity: pressed && mode === "apple" ? 0.85 : 1,
        transition:
          mode === "apple"
            ? "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)"
            : "transform 0.2s ease",
        boxShadow: pressed
          ? mode === "apple"
            ? "0 4px 16px rgba(61,61,80,0.12), 0 1px 4px rgba(61,61,80,0.06)"
            : "0 2px 8px rgba(0,0,0,0.15)"
          : "0 1px 4px rgba(61,61,80,0.04)",
        // Stagger fade-in
        animation: `fadeInUp ${mode === "apple" ? "400ms" : "300ms"} ${mode === "apple" ? "cubic-bezier(0.25, 0.1, 0.25, 1)" : "ease"} ${staggerDelay}ms both`,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
        {item.label}
      </div>
    </div>
  );
}

function ListItemDemo({
  item,
  isLast,
  mode,
}: {
  item: { icon: string; text: string; time: string };
  isLast: boolean;
  mode: "old" | "apple";
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderBottom: isLast ? "none" : "0.5px solid rgba(61,61,80,0.06)",
        cursor: "pointer",
        // Apple: nur opacity, kein scale
        background: pressed
          ? mode === "apple"
            ? "rgba(61,61,80,0.04)"
            : "rgba(61,61,80,0.08)"
          : "transparent",
        opacity: pressed && mode === "apple" ? 0.7 : 1,
        transition:
          mode === "apple"
            ? "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)"
            : "background 0.15s ease",
      }}
    >
      <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#3D3D50",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.text}
        </div>
        <div style={{ fontSize: 13, color: "#3D3D5066", marginTop: 1 }}>
          {item.time}
        </div>
      </div>
      <div style={{ color: "#3D3D5033", fontSize: 18 }}>›</div>
    </div>
  );
}

function ButtonDemo({
  mode,
  label,
  onClick,
  variant = "primary",
}: {
  mode: "old" | "apple";
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  const [pressed, setPressed] = useState(false);

  const isPrimary = variant === "primary";

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "16px 24px",
        borderRadius: 14,
        border: isPrimary ? "none" : "1.5px solid rgba(56,149,104,0.3)",
        fontSize: 16,
        fontWeight: 700,
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        background: isPrimary
          ? "linear-gradient(135deg, #389568, #2D7A54)"
          : "rgba(56,149,104,0.06)",
        color: isPrimary ? "#fff" : "#389568",
        // Animation-Unterschied:
        transform: pressed
          ? mode === "apple"
            ? "translateY(-1px)"
            : "scale(0.95)"
          : "translateY(0)",
        opacity: pressed && mode === "apple" ? 0.7 : 1,
        transition:
          mode === "apple"
            ? "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)"
            : "transform 0.2s ease",
        boxShadow: isPrimary
          ? pressed && mode === "apple"
            ? "0 4px 16px rgba(56,149,104,0.25)"
            : "0 2px 8px rgba(56,149,104,0.15)"
          : "none",
      }}
    >
      {label}
    </button>
  );
}

function FabDemo({ mode }: { mode: "old" | "apple" }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: "fixed",
        bottom: 90,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Apple: glow statt scale
        transform: pressed
          ? mode === "apple"
            ? "translateY(-2px)"
            : "scale(1.1)"
          : "translateY(0)",
        opacity: pressed && mode === "apple" ? 0.85 : 1,
        boxShadow: pressed
          ? mode === "apple"
            ? "0 4px 20px rgba(139,92,246,0.4), 0 8px 32px rgba(139,92,246,0.2)"
            : "0 4px 12px rgba(0,0,0,0.3)"
          : mode === "apple"
            ? "0 2px 12px rgba(139,92,246,0.25), 0 4px 20px rgba(139,92,246,0.1)"
            : "0 2px 8px rgba(0,0,0,0.2)",
        transition:
          mode === "apple"
            ? "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)"
            : "transform 0.2s ease, box-shadow 0.2s ease",
        // Apple glow-pulse animation
        animation:
          mode === "apple"
            ? "appleFabGlow 4s ease-in-out infinite"
            : "oldFabPulse 3s ease-in-out infinite",
      }}
    >
      <span style={{ color: "#fff", fontSize: 24, lineHeight: 1 }}>+</span>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes appleFabGlow {
          0%, 100% { box-shadow: 0 2px 12px rgba(139,92,246,0.25), 0 4px 20px rgba(139,92,246,0.1); }
          50% { box-shadow: 0 2px 16px rgba(139,92,246,0.35), 0 4px 28px rgba(139,92,246,0.18); }
        }
        @keyframes oldFabPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
