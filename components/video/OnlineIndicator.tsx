// OnlineIndicator — Gruener/grauer Punkt fuer Online-Status
'use client';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md';
}

/**
 * OnlineIndicator — Zeigt einen gruenen (online) oder grauen (offline) Punkt.
 * Senior-Modus: 'md' fuer bessere Sichtbarkeit.
 */
export function OnlineIndicator({ isOnline, size = 'sm' }: OnlineIndicatorProps) {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';

  return (
    <span
      className={`inline-block rounded-full ${sizeClass} ${
        isOnline ? 'bg-quartier-green' : 'bg-gray-300'
      }`}
      aria-label={isOnline ? 'Online' : 'Offline'}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
