"use client";

import { useEffect, useRef, useState } from "react";

// Verfügbare Illustrationen (Dateinamen ohne Pfad/Extension)
export type IllustrationName =
  | "ill-01-dorfplatz"
  | "ill-02-nachbarn"
  | "ill-03-marktstand"
  | "ill-04-pinnwand"
  | "ill-05-parkbank"
  | "ill-06-haus"
  | "ill-07-herz-haende"
  | "ill-08-stethoskop";

interface IllustrationRendererProps {
  name: IllustrationName;
  width?: number | string;
  height?: number | string;
  /** Zeichnen-Animation beim ersten Laden */
  animated?: boolean;
  className?: string;
}

/**
 * Rendert eine SVG-Illustration inline (für CSS-Animation).
 * Zeichnen-Animation via stroke-dasharray / stroke-dashoffset.
 * Respektiert prefers-reduced-motion.
 */
export function IllustrationRenderer({
  name,
  width = "100%",
  height = "auto",
  animated = false,
  className = "",
}: IllustrationRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // SVG laden
  useEffect(() => {
    let cancelled = false;

    fetch(`/illustrations/${name}.svg`)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) {
          setSvgContent(text);
        }
      })
      .catch(() => {
        // Stille Fehlerbehandlung — Illustration ist nicht kritisch
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  // Zeichnen-Animation anwenden
  useEffect(() => {
    if (!svgContent || !containerRef.current || !animated) {
      setLoaded(true);
      return;
    }

    // prefers-reduced-motion prüfen
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      setLoaded(true);
      return;
    }

    const paths = containerRef.current.querySelectorAll(
      "path, line, circle, ellipse, rect, polyline",
    );

    paths.forEach((el) => {
      const svgEl = el as SVGGeometryElement;
      if (typeof svgEl.getTotalLength === "function") {
        try {
          const length = svgEl.getTotalLength();
          svgEl.style.strokeDasharray = `${length}`;
          svgEl.style.strokeDashoffset = `${length}`;
          svgEl.style.transition = `stroke-dashoffset 1.5s ease-out`;
        } catch {
          // Einige Elemente unterstuetzen getTotalLength nicht
        }
      }
    });

    // Animation starten (nächster Frame)
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const animPaths = containerRef.current.querySelectorAll(
        "path, line, circle, ellipse, rect, polyline",
      );
      animPaths.forEach((el) => {
        (el as SVGGeometryElement).style.strokeDashoffset = "0";
      });
      setLoaded(true);
    });
  }, [svgContent, animated]);

  if (!svgContent) {
    return (
      <div
        className={`${className}`}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`illustration-renderer ${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
      style={{ width, height }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
