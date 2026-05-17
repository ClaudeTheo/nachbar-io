import { LegalLinksFooter } from "@/components/legal/LegalLinksFooter";

// Auth-Layout — kein Nav, zentrierter Inhalt.
//
// Seit 2026-05-17: feste Legal-Link-Zeile am unteren Rand, damit Login,
// Register und Onboarding-Anleitung die Pflichtlinks zu Impressum,
// Datenschutz, AGB und Barrierefreiheit auf jeder Seite zugaenglich machen
// (§ 5 DDG, DSGVO Art. 13).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between bg-warmwhite px-4 py-6">
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <div className="mt-8 w-full max-w-md">
        <LegalLinksFooter />
      </div>
      <span className="fixed bottom-2 left-2 text-[10px] text-gray-500">
        V
        {(process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0")
          .split(".")
          .slice(0, 2)
          .join(".")}
      </span>
    </main>
  );
}
