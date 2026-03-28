"use client";

import { useState } from "react";
import { isValidInviteCode } from "@/modules/hilfe/services/connections";

export default function InviteCodeInput() {
  const [code, setCode] = useState("");
  const [residentId, setResidentId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const upperCode = code.toUpperCase().trim();

    if (!isValidInviteCode(upperCode)) {
      setMessage("Bitte geben Sie einen gültigen 6-stelligen Code ein.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    const res = await fetch("/api/hilfe/connections/invite", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: upperCode, resident_id: residentId }),
    });

    if (res.ok) {
      setStatus("success");
      setMessage(
        "Verbindung angefragt! Der Bewohner muss die Verbindung noch bestätigen.",
      );
    } else {
      const data = await res.json();
      setStatus("error");
      setMessage(data.error || "Fehler beim Einlösen des Codes.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 p-6 space-y-4"
    >
      <h3 className="font-semibold text-gray-900">Verbindungs-Code eingeben</h3>
      <p className="text-sm text-gray-500">
        Ihr Senior hat Ihnen einen 6-stelligen Code gegeben? Geben Sie ihn hier
        ein.
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-center
                   text-2xl font-mono tracking-[0.3em] uppercase
                   min-h-[60px] focus:border-[#4CAF87] focus:ring-1 focus:ring-[#4CAF87] outline-none"
      />
      <button
        type="submit"
        disabled={code.length !== 6 || status === "loading"}
        className="w-full rounded-xl bg-[#4CAF87] px-6 py-4 text-white font-semibold
                   min-h-[52px] disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {status === "loading" ? "Wird geprüft..." : "Code einlösen"}
      </button>
      {message && (
        <p
          className={`text-sm ${status === "error" ? "text-red-500" : "text-green-600"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
