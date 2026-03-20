// components/care/RevokeDialog.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  featureLabel: string;
  onConfirm: (deleteData: boolean) => void;
  onCancel: () => void;
}

export function RevokeDialog({ featureLabel, onConfirm, onCancel }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-xl font-bold">Endgültig löschen?</h3>
          </div>
          <p className="text-muted-foreground">
            Alle Ihre {featureLabel}-Daten werden unwiderruflich gelöscht.
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => onConfirm(true)}
              className="w-full h-[60px] rounded-xl bg-red-500 text-white text-lg font-semibold active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              Ja, endgültig löschen
            </button>
            <button
              onClick={onCancel}
              className="w-full h-[60px] rounded-xl border-2 border-border text-anthrazit text-lg font-semibold active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-xl font-bold text-anthrazit">Einwilligung widerrufen</h3>
        <p className="text-muted-foreground">
          Sie widerrufen die Einwilligung für „{featureLabel}".
          Möchten Sie auch Ihre bestehenden Daten löschen?
        </p>
        <div className="space-y-3">
          <button
            onClick={() => onConfirm(false)}
            className="w-full h-[60px] rounded-xl bg-anthrazit text-white text-lg font-semibold active:scale-95"
            style={{ touchAction: 'manipulation' }}
          >
            Nur deaktivieren
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full h-[60px] rounded-xl border-2 border-amber-500 text-amber-700 text-lg font-semibold active:scale-95"
            style={{ touchAction: 'manipulation' }}
          >
            Deaktivieren und Daten löschen
          </button>
          <button
            onClick={onCancel}
            className="w-full text-center text-muted-foreground py-2"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
