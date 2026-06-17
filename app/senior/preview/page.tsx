import { notFound } from "next/navigation";

import KreisStartPage from "@/app/(senior)/kreis-start/page";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function SeniorLocalPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return (
    <main className="min-h-screen bg-warmwhite px-4 py-6 text-anthrazit">
      <div className="mx-auto max-w-[460px]">
        {/* KreisStartPage ist seit Welle SB eine async Server-Komponente -> hier
            eager awaiten und das Ergebnis einbetten (produktiv aequivalent). */}
        {await KreisStartPage()}
      </div>
    </main>
  );
}
