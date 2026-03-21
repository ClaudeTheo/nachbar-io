import { BottomNav } from "@/components/BottomNav";
import { HeartbeatProvider } from "@/components/HeartbeatProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PendingVerificationBanner } from "@/components/PendingVerificationBanner";
import { QuarterProvider } from "@/lib/quarters";
import { BugReportButton } from "@/components/BugReportButton";
import { VoiceAssistantFAB } from "@/components/VoiceAssistantFAB";
import { ExternalLinkProvider } from "@/components/ExternalLinkProvider";

// Layout fuer den aktiven Modus — mit Bottom-Navigation + Bug-Report
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
      {/* Quartier-Kontext + Hauptinhalt */}
      <QuarterProvider>
        <ExternalLinkProvider>
          <HeartbeatProvider>
            <main id="main-content" className="mx-auto max-w-lg px-4 pt-4">{children}</main>
          </HeartbeatProvider>
          <BugReportButton />
          <VoiceAssistantFAB />
        </ExternalLinkProvider>
      </QuarterProvider>
      <span className="fixed bottom-[68px] left-2 text-[10px] text-muted-foreground/40 z-10">
        V{(process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0').split('.').slice(0, 2).join('.')}
      </span>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
