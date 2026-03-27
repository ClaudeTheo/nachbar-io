'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ReportReason } from '@/lib/moderation/types';

// Meldegründe nach Apple App Store Guideline 1.2
const REPORT_REASONS: Array<{ value: ReportReason; label: string; icon: string }> = [
  { value: 'spam', label: 'Spam oder Werbung', icon: '📧' },
  { value: 'harassment', label: 'Belästigung', icon: '😤' },
  { value: 'hate', label: 'Hass oder Beleidigung', icon: '🚫' },
  { value: 'scam', label: 'Betrug oder Scam', icon: '⚠️' },
  { value: 'inappropriate', label: 'Unangemessener Inhalt', icon: '🔞' },
  { value: 'wrong_category', label: 'Falsche Kategorie', icon: '📂' },
  { value: 'other', label: 'Sonstiges', icon: '💬' },
];

interface ReportDialogProps {
  contentType: string;
  contentId: string;
  /** Optionaler Trigger-Button (Standard: kein Trigger, Dialog wird über open gesteuert) */
  trigger?: React.ReactNode;
  /** Gesteuerter Modus: open/onOpenChange */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportDialog({
  contentType,
  contentId,
  trigger,
  open,
  onOpenChange,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setSelectedReason(null);
    setReasonText('');
  }

  async function handleSubmit() {
    if (!selectedReason) return;

    setLoading(true);
    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          reasonCategory: selectedReason,
          reasonText: reasonText || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          toast.error('Sie haben diesen Inhalt bereits gemeldet.');
        } else {
          toast.error(data.error || 'Meldung fehlgeschlagen');
        }
        setLoading(false);
        return;
      }

      toast.success('Danke, wir prüfen das.');
      resetForm();
      onOpenChange?.(false);
    } catch {
      toast.error('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange?.(val); if (!val) resetForm(); }}>
      {trigger && <DialogTrigger render={<>{trigger}</>} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inhalt melden</DialogTitle>
          <DialogDescription>
            Warum möchten Sie diesen Inhalt melden?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => setSelectedReason(reason.value)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                selectedReason === reason.value
                  ? 'border-quartier-green bg-quartier-green/10 font-medium'
                  : 'border-border hover:bg-muted'
              }`}
              style={{ minHeight: '48px' }}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg">{reason.icon}</span>
                {reason.label}
              </span>
            </button>
          ))}
        </div>

        {/* Optionaler Freitext bei "Sonstiges" oder allgemein */}
        {selectedReason && (
          <div>
            <label htmlFor="report-text" className="block text-sm text-muted-foreground mb-1">
              Weitere Details (optional)
            </label>
            <textarea
              id="report-text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full rounded-lg border p-3 text-sm"
              rows={2}
              maxLength={500}
              placeholder="Beschreiben Sie das Problem..."
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Abbrechen
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || loading}
            variant="destructive"
          >
            {loading ? 'Wird gesendet...' : 'Melden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
