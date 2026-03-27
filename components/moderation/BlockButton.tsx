'use client';

import { useState } from 'react';
import { Ban, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { BlockLevel } from '@/lib/moderation/types';

interface BlockButtonProps {
  /** ID des zu blockierenden Nutzers */
  userId: string;
  /** Aktueller Block-Status (null = nicht blockiert) */
  currentBlockLevel?: BlockLevel | null;
  /** Callback nach Statusänderung */
  onBlockChange?: (level: BlockLevel | null) => void;
  /** Kompakte Darstellung (nur Icon) */
  compact?: boolean;
}

export function BlockButton({
  userId,
  currentBlockLevel = null,
  onBlockChange,
  compact = false,
}: BlockButtonProps) {
  const [loading, setLoading] = useState(false);
  const [blockLevel, setBlockLevel] = useState<BlockLevel | null>(currentBlockLevel);

  const isBlocked = blockLevel !== null;

  async function handleToggle() {
    setLoading(true);
    try {
      if (isBlocked) {
        // Block aufheben
        const res = await fetch('/api/moderation/block', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockedId: userId }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || 'Block konnte nicht aufgehoben werden');
          setLoading(false);
          return;
        }
        setBlockLevel(null);
        onBlockChange?.(null);
        toast.success('Block aufgehoben');
      } else {
        // Nutzer blockieren
        const res = await fetch('/api/moderation/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockedId: userId, blockLevel: 'block' }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || 'Blockieren fehlgeschlagen');
          setLoading(false);
          return;
        }
        setBlockLevel('block');
        onBlockChange?.('block');
        toast.success('Nutzer blockiert');
      }
    } catch {
      toast.error('Verbindungsfehler');
    }
    setLoading(false);
  }

  if (compact) {
    return (
      <Button
        variant={isBlocked ? 'destructive' : 'ghost'}
        size="icon-sm"
        onClick={handleToggle}
        disabled={loading}
        aria-label={isBlocked ? 'Block aufheben' : 'Nutzer blockieren'}
      >
        {isBlocked ? <UserCheck className="size-4" /> : <Ban className="size-4" />}
      </Button>
    );
  }

  return (
    <Button
      variant={isBlocked ? 'destructive' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {isBlocked ? (
        <>
          <UserCheck className="size-4" />
          <span>{loading ? 'Wird aufgehoben...' : 'Block aufheben'}</span>
        </>
      ) : (
        <>
          <Ban className="size-4" />
          <span>{loading ? 'Wird blockiert...' : 'Blockieren'}</span>
        </>
      )}
    </Button>
  );
}
