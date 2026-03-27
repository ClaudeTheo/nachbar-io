'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Flag, VolumeX, Ban, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ReportDialog } from './ReportDialog';
import type { BlockLevel } from '@/lib/moderation/types';

interface ContentActionsProps {
  contentType: string;
  contentId: string;
  /** ID des Autors (für Block/Mute) */
  authorId: string;
  /** Eigener Inhalt? Dann keine Aktionen anzeigen */
  isOwnContent?: boolean;
}

// Aktionen im Drei-Punkte-Menue
const MENU_ITEMS = [
  { key: 'report', label: 'Melden', icon: Flag, color: 'text-alert-amber' },
  { key: 'mute', label: 'Stummschalten', icon: VolumeX, color: 'text-muted-foreground' },
  { key: 'block', label: 'Blockieren', icon: Ban, color: 'text-emergency-red' },
  { key: 'safety', label: 'Sicherheit melden', icon: ShieldAlert, color: 'text-emergency-red' },
] as const;

type MenuAction = typeof MENU_ITEMS[number]['key'];

export function ContentActions({
  contentType,
  contentId,
  authorId,
  isOwnContent = false,
}: ContentActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside zum Schliessen
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Eigenen Content nicht melden/blockieren
  if (isOwnContent) return null;

  async function handleBlock(level: BlockLevel) {
    setBlockLoading(true);
    try {
      const res = await fetch('/api/moderation/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: authorId, blockLevel: level }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Aktion fehlgeschlagen');
      } else {
        const msg = level === 'mute'
          ? 'Nutzer stummgeschaltet. Sie sehen keine Beiträge mehr.'
          : 'Nutzer blockiert.';
        toast.success(msg);
      }
    } catch {
      toast.error('Verbindungsfehler');
    }
    setBlockLoading(false);
    setMenuOpen(false);
  }

  function handleAction(action: MenuAction) {
    switch (action) {
      case 'report':
        setMenuOpen(false);
        setReportOpen(true);
        break;
      case 'mute':
        handleBlock('mute');
        break;
      case 'block':
        handleBlock('block');
        break;
      case 'safety':
        setMenuOpen(false);
        // Sicherheitshinweis: Polizei 110
        toast.error(
          'Bei akuter Gefahr rufen Sie bitte sofort 110 (Polizei) oder 112 (Notruf) an.',
          { duration: 8000 },
        );
        // Gleichzeitig Safety-Block setzen
        handleBlock('safety');
        break;
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Weitere Aktionen"
          aria-expanded={menuOpen}
          disabled={blockLoading}
        >
          <MoreVertical className="size-4" />
        </Button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border bg-background shadow-md"
            role="menu"
          >
            {MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => handleAction(item.key)}
                disabled={blockLoading}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
              >
                <item.icon className={`size-4 ${item.color}`} />
                <span className={item.key === 'safety' ? 'font-medium text-emergency-red' : ''}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ReportDialog wird separat gerendert (nicht im Menue) */}
      <ReportDialog
        contentType={contentType}
        contentId={contentId}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </>
  );
}
