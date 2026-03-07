import { BottomNav } from "@/components/BottomNav";

// Layout für den aktiven Modus — mit Bottom-Navigation
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warmwhite pb-20">
      {/* Hauptinhalt mit Padding für Bottom-Nav */}
      <main className="mx-auto max-w-lg px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
