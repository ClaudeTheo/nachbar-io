'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

interface SosButtonProps {
  href?: string;
  compact?: boolean;
}

export function SosButton({ href = '/care/sos/new', compact = false }: SosButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full rounded-2xl bg-emergency-red text-white font-bold shadow-lg
        active:bg-red-700 transition-colors
        ${compact ? 'px-6 py-4 text-lg' : 'px-8 py-10 text-3xl'}
      `}
      style={{ minHeight: compact ? '60px' : '100px', touchAction: 'manipulation' }}
      aria-label="SOS — Ich brauche Hilfe"
    >
      <span className="flex items-center justify-center gap-3">
        <AlertTriangle className={compact ? 'h-6 w-6' : 'h-10 w-10'} />
        {compact ? 'SOS' : '🆘 Ich brauche Hilfe'}
      </span>
    </button>
  );
}
