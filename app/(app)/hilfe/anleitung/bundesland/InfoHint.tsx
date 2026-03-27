'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

/** Aufklappbares Info-Zeichen mit einfacher Erklaerung */
export function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="inline-flex items-start">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ml-1 p-1 rounded-full text-gray-400 hover:text-[#4CAF87] hover:bg-gray-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Erklärung anzeigen"
      >
        {open ? <X className="w-4 h-4" /> : <Info className="w-4 h-4" />}
      </button>
      {open && (
        <span className="block ml-1 mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 max-w-[240px] leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}
