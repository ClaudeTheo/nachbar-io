"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";

interface HelpTipProps {
  title: string;
  content: string;
}

// Kontextueller Hilfe-Tooltip mit mobilem Viewport-Clamping und besserer Dialog-A11y.
export function HelpTip({ title, content }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const titleId = `${tooltipId}-title`;
  const descriptionId = `${tooltipId}-description`;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground sm:h-8 sm:w-8"
        aria-label={`Hilfe: ${title}`}
        aria-controls={tooltipId}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CircleHelp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </button>

      {open && (
        <div
          id={tooltipId}
          ref={dialogRef}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white p-3 shadow-lg outline-none sm:bottom-full sm:left-1/2 sm:right-auto sm:top-auto sm:mb-2 sm:mt-0 sm:w-64 sm:-translate-x-1/2"
        >
          <div className="absolute bottom-full right-3 border-[7px] border-transparent border-b-border sm:hidden" />
          <div className="absolute bottom-full right-3 translate-y-px border-[7px] border-transparent border-b-white sm:hidden" />
          <div className="absolute left-1/2 top-full hidden -translate-x-1/2 border-[7px] border-transparent border-t-border sm:block" />
          <div className="absolute left-1/2 top-full hidden -translate-x-1/2 -translate-y-px border-[7px] border-transparent border-t-white sm:block" />

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p id={titleId} className="text-xs font-semibold text-anthrazit">
                {title}
              </p>
              <p
                id={descriptionId}
                className="mt-1 text-xs leading-relaxed text-muted-foreground"
              >
                {content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="-m-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
              aria-label={`Hilfe schließen: ${title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
