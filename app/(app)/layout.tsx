import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PendingVerificationBanner } from "@/components/PendingVerificationBanner";
import { TestModeProvider } from "@/components/testing/TestModeProvider";
import { TesterWelcomeDialog } from "@/components/testing/TesterWelcomeDialog";

// Layout fuer den aktiven Modus — mit Bottom-Navigation + Test-Modus
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warmwhite pb-20">
      {/* Skip-Navigation fuer Tastaturnutzer */}
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
      {/* Hauptinhalt mit Padding fuer Bottom-Nav + Test-Modus Provider */}
      <TestModeProvider>
        <main id="main-content" className="mx-auto max-w-lg px-4 pt-4">{children}</main>
        <TesterWelcomeDialog />
      </TestModeProvider>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
