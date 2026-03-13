'use client';

// Zeigt eine einzelne Helfer-Karte mit Avatar, Rolle, Verifikations-Status, Skills und Statistiken

import { CheckCircle, Clock, ShieldOff, Star } from 'lucide-react';
import type { CareHelper, CareHelperRole, CareHelperVerification } from '@/lib/care/types';

interface HelperCardProps {
  helper: CareHelper;
  showVerifyButton?: boolean;
  onVerify?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

// Rollen-Badge: Farbe je nach Rolle
const ROLE_CONFIG: Record<CareHelperRole, { label: string; className: string }> = {
  neighbor:     { label: 'Nachbar',        className: 'bg-green-100 text-green-700' },
  relative:     { label: 'Angehoerige/r',  className: 'bg-blue-100 text-blue-700' },
  care_service: { label: 'Pflegedienst',   className: 'bg-purple-100 text-purple-700' },
};

// Verifikations-Badge: Farbe und Label je nach Status
const VERIFICATION_CONFIG: Record<CareHelperVerification, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending:  { label: 'Ausstehend', className: 'bg-amber-100 text-alert-amber',   Icon: Clock },
  verified: { label: 'Verifiziert', className: 'bg-green-100 text-quartier-green', Icon: CheckCircle },
  revoked:  { label: 'Gesperrt',   className: 'bg-red-100 text-red-600',          Icon: ShieldOff },
};

// Initialen-Avatar fuer Nutzer ohne Avatar-URL
function InitialsAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-anthrazit text-white font-bold text-lg select-none"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function HelperCard({ helper, showVerifyButton, onVerify, onRevoke }: HelperCardProps) {
  const displayName = helper.user?.display_name ?? 'Unbekannt';
  const roleConfig = ROLE_CONFIG[helper.role];
  const verConfig = VERIFICATION_CONFIG[helper.verification_status];
  const { Icon: VerIcon } = verConfig;

  return (
    <div className="rounded-xl border border-gray-200 bg-card p-4 space-y-3">
      {/* Kopfzeile: Avatar, Name, Rollen-Badge, Verifikations-Badge */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {helper.user?.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={helper.user.avatar_url}
            alt={displayName}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar name={displayName} />
        )}

        {/* Name und Badges */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-bold text-anthrazit leading-tight truncate">{displayName}</p>

          <div className="flex flex-wrap gap-1.5">
            {/* Rollen-Badge */}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleConfig.className}`}>
              {roleConfig.label}
            </span>

            {/* Verifikations-Badge */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${verConfig.className}`}>
              <VerIcon className="h-3 w-3" />
              {verConfig.label}
            </span>
          </div>
        </div>

        {/* Statistik-Icon */}
        <div className="shrink-0 flex flex-col items-end text-right text-xs text-muted-foreground gap-0.5">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            <span className="font-medium text-anthrazit">{helper.response_count}</span>
            <span>Einsaetze</span>
          </div>
          {helper.avg_response_minutes !== null && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>&#216; {Math.round(helper.avg_response_minutes)} Min.</span>
            </div>
          )}
        </div>
      </div>

      {/* Skills als Pills */}
      {helper.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {helper.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Aktions-Buttons (Verifizieren / Sperren) */}
      {showVerifyButton && (
        <div className="flex gap-2 pt-1">
          {helper.verification_status === 'pending' && onVerify && (
            <button
              onClick={() => onVerify(helper.id)}
              className="flex-1 rounded-lg bg-quartier-green py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              Verifizieren
            </button>
          )}
          {helper.verification_status === 'verified' && onRevoke && (
            <button
              onClick={() => onRevoke(helper.id)}
              className="flex-1 rounded-lg border-2 border-red-300 py-3 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              Sperren
            </button>
          )}
          {helper.verification_status === 'revoked' && onVerify && (
            <button
              onClick={() => onVerify(helper.id)}
              className="flex-1 rounded-lg border-2 border-gray-300 py-3 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              Wieder aktivieren
            </button>
          )}
        </div>
      )}
    </div>
  );
}
