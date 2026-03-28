"use client";

import { useEffect, useRef, useState } from "react";

interface LargeTitleProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function LargeTitle({ title, subtitle, children }: LargeTitleProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCollapsed(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel: wenn aus Viewport gescrollt, kollabiert der Titel */}
      <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />

      {/* Sticky Header (kollabiert) */}
      <div
        data-testid="large-title-collapsed-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(253,248,243,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: collapsed
            ? "0.5px solid rgba(61,61,80,0.08)"
            : "0.5px solid transparent",
          padding: "10px 16px",
          opacity: collapsed ? 1 : 0,
          transform: collapsed ? "translateY(0)" : "translateY(-4px)",
          transition: "all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)",
          pointerEvents: collapsed ? "auto" : "none",
        }}
      >
        <h1
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#3D3D50",
            margin: 0,
            textAlign: "center",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Grosser Titel */}
      <div
        data-testid="large-title-container"
        style={{
          padding: "4px 16px 16px",
          opacity: collapsed ? 0.3 : 1,
          transform: collapsed ? "translateY(-8px)" : "translateY(0)",
          transition: "all 350ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
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
          {title}
        </h1>
        {subtitle && (
          <p
            data-testid="large-title-subtitle"
            style={{
              fontSize: 15,
              color: "rgba(61,61,80,0.5)",
              margin: "4px 0 0",
              fontWeight: 400,
            }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </>
  );
}
