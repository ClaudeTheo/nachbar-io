"use client";

// Zeigt die eigene User-ID mit Copy-Button. Wird im "Neuer Kontakt"-Screen
// verwendet, damit der Nutzer seine ID an Bekannte geben kann.

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function MyUserIdCard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  async function handleCopy() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail — bei fehlender Clipboard-API zeigen wir ID nur visuell
    }
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-[#2D3142]/10 bg-[#F8F9FA] p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-[#2D3142]/10" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#2D3142]/10 bg-[#F8F9FA] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[#2D3142]">
        Ihre Nutzer-ID (zum Weitergeben)
      </h3>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-xl bg-white px-3 py-2 font-mono text-xs text-[#2D3142]">
          {userId}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="ID kopieren"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4CAF87] text-white"
        >
          {copied ? (
            <Check className="h-5 w-5" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-[#2D3142]/60">
        Geben Sie diese ID an Freunde weiter, damit sie Sie einladen koennen.
      </p>
    </div>
  );
}
