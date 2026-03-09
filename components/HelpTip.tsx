"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

interface HelpTipProps {
  title: string;
  content: string;
}

// Kontextueller Hilfe-Tooltip: kleines ?-Icon, Klick zeigt Erklärung
export function HelpTip({ title, content }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Klick ausserhalb schliesst den Tooltip
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
        aria-label={`Hilfe: ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-white p-3 shadow-lg">
          {/* Pfeil nach unten */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-white" />
          <div className="absolute left-1/2 top-full -translate-x-1/2 mt-px border-[6px] border-transparent border-t-border" />

          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-anthrazit">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {content}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
