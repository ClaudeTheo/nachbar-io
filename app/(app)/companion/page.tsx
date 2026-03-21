// app/(app)/companion/page.tsx
// Seite fuer den KI-Quartier-Lotsen (Companion Chat)

import { CompanionChat } from '@/components/companion/CompanionChat';

export default function CompanionPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <CompanionChat />
    </div>
  );
}
