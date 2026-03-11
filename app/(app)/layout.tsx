import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PendingVerificationBanner } from "@/components/PendingVerificationBanner";

// Layout für den aktiven Modus — mit Bottom-Navigation
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warmwhite pb-20">
      {/* Skip-Navigation für Tastaturnutzer */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-quartier-green focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Zum Inhalt springen
      </a>
      {/* Verifikations-Banner fuer pending Nutzer */}
      <div className="mx-auto max-w-lg pt-4">
        <PendingVerificationBanner />
      </div>
      {/* Hauptinhalt mit Padding für Bottom-Nav */}
      <main id="main-content" className="mx-auto max-w-lg px-4 pt-4">{children}</main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
