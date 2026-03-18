"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green/90"
    >
      Alle drucken
    </button>
  );
}
