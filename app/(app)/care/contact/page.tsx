"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Video, MessageCircle, Users, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// Beziehungstyp-Labels (deutsch)
const RELATIONSHIP_LABELS: Record<string, string> = {
  partner: "Partner/in",
  child: "Kind",
  grandchild: "Enkelkind",
  friend: "Freund/in",
  volunteer: "Ehrenamtlich",
  other: "Sonstiges",
};

interface CaregiverLink {
  id: string;
  caregiver_id: string;
  relationship_type: string;
  heartbeat_visible: boolean;
  created_at: string;
  revoked_at: string | null;
  caregiver: { display_name: string; avatar_url: string | null } | null;
}

export default function CareContactPage() {
  const router = useRouter();
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/caregiver/links");
      if (res.ok) {
        const data = await res.json();
        // Nur aktive Links (nicht widerrufen) als Bewohner
        setLinks(
          (data.as_resident ?? []).filter((l: CaregiverLink) => !l.revoked_at),
        );
      }
    } catch {
      // Stille Fehlerbehandlung
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Video-Call starten
  function startVideoCall(caregiverId: string) {
    router.push(`/call/${caregiverId}`);
  }

  // Chat oeffnen (Konversation erstellen/finden, dann navigieren)
  async function openChat(caregiverId: string) {
    setChatLoading(caregiverId);
    try {
      const res = await fetch("/api/care/contact/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiver_id: caregiverId }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/messages/${data.conversation_id}`);
      }
    } catch {
      // Fehler still ignorieren
    } finally {
      setChatLoading(null);
    }
  }

  // Initialen aus display_name
  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Meine Angehörigen"
        subtitle="Video-Call oder Chat mit Ihren verknüpften Angehörigen"
        backHref="/care"
      />

      {loading && <p className="text-anthrazit/50">Laden...</p>}

      {/* Angehoerigen-Karten */}
      {links.length > 0 && (
        <div className="space-y-4">
          {links.map((link) => {
            const name = link.caregiver?.display_name ?? "Angehöriger";
            const avatar = link.caregiver?.avatar_url;
            const relation =
              RELATIONSHIP_LABELS[link.relationship_type] ??
              link.relationship_type;

            return (
              <div
                key={link.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <span aria-hidden="true">{getInitials(name)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-anthrazit truncate">
                      {name}
                    </p>
                    <p className="text-sm text-anthrazit/60">{relation}</p>
                  </div>
                </div>

                {/* Aktions-Buttons (80px Seniorenmodus) */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => startVideoCall(link.caregiver_id)}
                    className="flex min-h-[80px] items-center justify-center gap-2 rounded-2xl bg-quartier-green text-lg font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80"
                  >
                    <Video className="h-6 w-6" />
                    Anrufen
                  </button>

                  <button
                    onClick={() => openChat(link.caregiver_id)}
                    disabled={chatLoading === link.caregiver_id}
                    className="flex min-h-[80px] items-center justify-center gap-2 rounded-2xl bg-blue-500 text-lg font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50"
                  >
                    <MessageCircle className="h-6 w-6" />
                    {chatLoading === link.caregiver_id
                      ? "Laden..."
                      : "Nachricht"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Keine Angehoerigen verknuepft */}
      {!loading && links.length === 0 && (
        <div className="rounded-2xl bg-anthrazit/5 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-anthrazit/30" />
          <p className="mt-3 text-xl text-anthrazit/60">
            Noch keine Angehörigen verknüpft
          </p>
          <p className="text-anthrazit/40 mt-2">
            Bitten Sie Ihre Angehörigen, sich über die QuartierApp mit Ihnen zu
            verknüpfen.
          </p>
          <button
            onClick={() => router.push("/care/caregiver")}
            className="mt-4 inline-flex min-h-[56px] items-center gap-2 rounded-xl bg-quartier-green px-6 text-base font-semibold text-white transition-colors hover:bg-quartier-green/90"
          >
            <UserPlus className="h-5 w-5" />
            Einladung verwalten
          </button>
        </div>
      )}
    </div>
  );
}
