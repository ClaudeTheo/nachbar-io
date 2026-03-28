// components/companion/ChatHeader.tsx
// Header-Bereich des Companion-Chats mit Bot-Icon und Titel

import { Bot } from 'lucide-react';

export function ChatHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-quartier-green/10">
        <Bot className="h-5 w-5 text-quartier-green" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-anthrazit">Quartier-Lotse</h1>
        <p className="text-xs text-muted-foreground">KI-Assistent für Ihr Quartier</p>
      </div>
    </div>
  );
}
