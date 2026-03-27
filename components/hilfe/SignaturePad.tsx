'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onSign: (dataUrl: string) => void;
  label: string;
  width?: number;
  height?: number;
}

/**
 * Unterschriften-Feld mit Touch- und Maus-Unterstützung.
 * Senior-Modus: 300x150px Standard, große Touch-Targets.
 */
export default function SignaturePad({
  onSign,
  label,
  width = 300,
  height = 150,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Zeichenkontext konfigurieren
  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#2D3142'; // Anthrazit
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    return ctx;
  }, []);

  // Position relativ zum Canvas berechnen
  const getPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    },
    []
  );

  // Zeichnung starten
  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const ctx = getCtx();
      if (!ctx) return;
      isDrawingRef.current = true;
      const pos = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [getCtx, getPosition]
  );

  // Zeichnung fortsetzen
  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const pos = getPosition(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [getCtx, getPosition]
  );

  // Zeichnung beenden und DataURL senden
  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSign(dataUrl);
  }, [onSign]);

  // Canvas leeren
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="touch-none rounded-md border border-border bg-white"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-[48px] w-fit"
        onClick={handleClear}
      >
        Löschen
      </Button>
    </div>
  );
}
