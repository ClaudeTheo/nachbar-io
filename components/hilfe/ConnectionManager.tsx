"use client";

import { useState, useEffect } from "react";
import type { HelperConnection } from "@/lib/hilfe/types";

interface ConnectionManagerProps {
  role: "helper" | "senior";
}

export default function ConnectionManager({ role }: ConnectionManagerProps) {
  const [connections, setConnections] = useState<HelperConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    const res = await fetch("/api/hilfe/connections");
    if (res.ok) {
      setConnections(await res.json());
    }
    setLoading(false);
  }

  async function generateCode() {
    const res = await fetch("/api/hilfe/connections/invite", {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setInviteCode(data.code);
    }
  }

  async function confirmConnection(id: string) {
    const res = await fetch(`/api/hilfe/connections/${id}`, { method: "PUT" });
    if (res.ok) {
      loadConnections();
    }
  }

  async function revokeConnection(id: string) {
    if (
      !confirm(
        "Verbindung wirklich beenden? Bestehende Abrechnungen bleiben erhalten.",
      )
    )
      return;
    const res = await fetch(`/api/hilfe/connections/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      loadConnections();
    }
  }

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded-xl" />;
  }

  const active = connections.filter((c) => c.confirmed_at && !c.revoked_at);
  const pending = connections.filter((c) => !c.confirmed_at && !c.revoked_at);

  return (
    <div className="space-y-6">
      {/* Senior: Einladungs-Code generieren */}
      {role === "senior" && (
        <div className="rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Helfer einladen</h3>
          {inviteCode ? (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                Teilen Sie diesen Code mit Ihrem Helfer:
              </p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-[#4CAF87] mb-2">
                {inviteCode}
              </p>
              <p className="text-xs text-gray-400">Gueltig fuer 24 Stunden</p>
            </div>
          ) : (
            <button
              onClick={generateCode}
              className="w-full rounded-xl bg-[#4CAF87] px-6 py-4 text-white font-semibold
                         min-h-[80px] text-lg active:scale-[0.98] transition-transform"
            >
              Einladungs-Code erstellen
            </button>
          )}
        </div>
      )}

      {/* Aktive Verbindungen */}
      {active.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            {role === "senior" ? "Meine Helfer" : "Meine Klienten"} (
            {active.length})
          </h3>
          <div className="space-y-3">
            {active.map((conn) => (
              <div
                key={conn.id}
                className="rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    Verbindung seit{" "}
                    {new Date(conn.confirmed_at!).toLocaleDateString("de-DE")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {conn.source === "invitation"
                      ? "Per Einladung"
                      : "Ueber Hilfe-Gesuch"}
                  </p>
                </div>
                <button
                  onClick={() => revokeConnection(conn.id)}
                  className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-lg
                             min-h-[44px] min-w-[44px]"
                >
                  Beenden
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wartende Verbindungen (Senior muss bestaetigen) */}
      {pending.length > 0 && role === "senior" && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Wartende Anfragen ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((conn) => (
              <div
                key={conn.id}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="text-sm text-gray-600 mb-3">
                  Ein Helfer moechte sich mit Ihnen verbinden.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => confirmConnection(conn.id)}
                    className="flex-1 rounded-xl bg-[#4CAF87] px-4 py-3 text-white font-semibold
                               min-h-[52px] active:scale-[0.98] transition-transform"
                  >
                    Bestaetigen
                  </button>
                  <button
                    onClick={() => revokeConnection(conn.id)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-gray-600
                               min-h-[52px] active:scale-[0.98] transition-transform"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && pending.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg mb-1">Noch keine Verbindungen</p>
          <p className="text-sm">
            {role === "senior"
              ? "Laden Sie einen Helfer ein oder warten Sie auf eine Anfrage ueber ein Hilfe-Gesuch."
              : "Melden Sie sich auf ein Hilfe-Gesuch oder geben Sie einen Einladungs-Code ein."}
          </p>
        </div>
      )}
    </div>
  );
}
