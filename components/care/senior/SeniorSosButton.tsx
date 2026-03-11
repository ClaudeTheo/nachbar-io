'use client';

import { useRouter } from 'next/navigation';

export function SeniorSosButton({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push('/sos')} disabled={disabled}
      className="w-full rounded-2xl bg-red-600 px-8 py-10 text-3xl font-bold text-white shadow-lg active:bg-red-700 disabled:opacity-50"
      style={{ minHeight: '100px', touchAction: 'manipulation' }}
      aria-label="SOS — Ich brauche Hilfe">
      🆘 Ich brauche Hilfe
    </button>
  );
}
