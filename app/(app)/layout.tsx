import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HeartbeatProvider } from "@/components/HeartbeatProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PageTransition } from "@/components/PageTransition";
import { PendingVerificationBanner } from "@/components/PendingVerificationBanner";
import { QuarterProvider } from "@/lib/quarters";
import { BugReportButton } from "@/components/BugReportButton";
import { VoiceAssistantFAB } from "@/modules/voice/components/VoiceAssistantFAB";
import { ExternalLinkProvider } from "@/components/ExternalLinkProvider";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GlobalCallListener } from "@/components/video/GlobalCallListener";
import { PresenceHeartbeat } from "@/components/video/PresenceHeartbeat";
import { SosProvider } from "@/components/sos/SosContext";
import { SosConfirmationSheet } from "@/components/sos/SosConfirmationSheet";
import { SosHeaderIcon } from "@/components/sos/SosHeaderIcon";

// Layout fuer den aktiven Modus — mit Bottom-Navigation + Bug-Report
export default function AppLayout({ children }: { children: React.ReactNode }) {
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
      <div className="mx-auto max-w-lg pt-2">
        <PendingVerificationBanner />
      </div>
      {/* Quartier-Kontext + Hauptinhalt */}
      <AuthProvider>
        <AuthSessionProvider>
          <QuarterProvider>
            <ExternalLinkProvider>
              <SosProvider>
                <HeartbeatProvider>
                  <GlobalCallListener />
                  <PresenceHeartbeat />
                  {/* SOS-Header-Icon (auf allen Seiten ausser Dashboard) */}
                  <SosHeaderIcon />
                  <main
                    id="main-content"
                    className="mx-auto max-w-lg px-4 pt-2"
                  >
                    <ErrorBoundary>
                      <PageTransition>{children}</PageTransition>
                    </ErrorBoundary>
                  </main>
                </HeartbeatProvider>
                {/* SOS-Bestaetigungsblatt (globaler Sheet) */}
                <SosConfirmationSheet />
                <BugReportButton />
                <VoiceAssistantFAB />
              </SosProvider>
            </ExternalLinkProvider>
          </QuarterProvider>
        </AuthSessionProvider>
      </AuthProvider>
      <span className="fixed bottom-[68px] left-2 z-10 hidden text-[10px] text-muted-foreground/60 sm:block">
        V
        {(process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0")
          .split(".")
          .slice(0, 2)
          .join(".")}
      </span>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
