"use client";

import { useMemo, useState } from "react";

type Result = {
  token: string;
  code: string;
  expiresAt: string;
  magicLinkUrl: string;
};

export default function HausverwaltungEinladenPage() {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const canSubmit = orgName.trim().length > 0 && !pending;

  async function createInvitation(channel: "mailto" | "share" | "pdf") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/housing/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedOrgName: orgName,
          expectedEmail: email || undefined,
          channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Einladung konnte nicht erstellt werden");
        return null;
      }
      setResult(data as Result);
      return data as Result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Netzwerk-Fehler";
      setError(msg);
      return null;
    } finally {
      setPending(false);
    }
  }

  const mailtoHref = useMemo(() => {
    if (!result || !email) return "";
    const subject = encodeURIComponent(
      "Einladung zur QuartierApp — Ihre Mieterin/Ihr Mieter laedt Sie ein",
    );
    const body = encodeURIComponent(
      `Guten Tag,\n\n` +
        `Ihre Mieterin/Ihr Mieter moechte Sie zur Hausverwaltungs-Funktion von QuartierApp einladen.\n\n` +
        `Einladungs-Link:\n${result.magicLinkUrl}\n\n` +
        `Oder manueller Code: ${result.code}\n\n` +
        `Sie koennen sich dort entweder anmelden oder einen neuen Account anlegen.\n` +
        `Die Einladung ist bis zum ${new Date(result.expiresAt).toLocaleDateString("de-DE")} gueltig.\n\n` +
        `Mit freundlichen Gruessen`,
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }, [result, email]);

  async function handleShare() {
    if (!result) return;
    const shareData = {
      title: "Einladung zur QuartierApp",
      text: `Einladung fuer ${orgName}. Code: ${result.code}`,
      url: result.magicLinkUrl,
    };
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share(shareData);
      } catch {
        // Abbruch durch User — nichts tun
      }
    } else if (nav?.clipboard) {
      await nav.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      alert("Einladung in die Zwischenablage kopiert");
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createInvitation(email ? "mailto" : "share");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:py-0">
      <h1 className="text-3xl font-semibold text-[#2D3142] print:hidden">
        Hausverwaltung einladen
      </h1>
      <p className="mt-2 text-lg text-gray-700 print:hidden">
        Sie erzeugen einen Einladungs-Link fuer Ihre Hausverwaltung. Sie
        entscheiden, wie Sie ihn weitergeben.
      </p>

      {!result && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="orgName"
              className="block text-lg font-medium text-[#2D3142]"
            >
              Name der Hausverwaltung
            </label>
            <input
              id="orgName"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-4 text-lg"
              style={{ minHeight: 80 }}
              placeholder="z.B. Hausverwaltung Mueller GmbH"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-lg font-medium text-[#2D3142]"
            >
              E-Mail der Hausverwaltung (optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 px-4 text-lg"
              style={{ minHeight: 80 }}
              placeholder="info@ihre-hausverwaltung.de"
            />
            <p className="mt-1 text-sm text-gray-500">
              Nur, falls Sie per E-Mail einladen moechten. Sonst nicht noetig.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-4 text-base text-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-md bg-[#4CAF87] px-6 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: 80 }}
          >
            {pending ? "Einladung wird erstellt..." : "Einladung erstellen"}
          </button>
        </form>
      )}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="rounded-md bg-green-50 p-6">
            <p className="text-lg text-green-900">
              Einladung fuer <span className="font-semibold">{orgName}</span>{" "}
              erstellt.
            </p>
            <p className="mt-2 text-base text-green-800">
              Gueltig bis:{" "}
              {new Date(result.expiresAt).toLocaleDateString("de-DE")}
            </p>
          </div>

          <div className="rounded-md border border-gray-200 p-6">
            <p className="text-base text-gray-700">
              Einladungs-Code (fuer telefonische Weitergabe):
            </p>
            <p
              className="mt-2 text-center font-mono tracking-widest text-[#2D3142]"
              style={{ fontSize: 56, letterSpacing: "0.5rem" }}
            >
              {result.code}
            </p>
          </div>

          <div className="rounded-md border border-gray-200 p-6">
            <p className="text-base text-gray-700">Einladungs-Link:</p>
            <p className="mt-2 break-all text-base text-blue-700">
              {result.magicLinkUrl}
            </p>
          </div>

          <div className="space-y-4 print:hidden">
            <h2 className="text-xl font-semibold text-[#2D3142]">
              Wie moechten Sie die Einladung weitergeben?
            </h2>

            {email && (
              <a
                href={mailtoHref}
                className="flex w-full items-center justify-center rounded-md bg-[#4CAF87] px-6 text-lg font-semibold text-white"
                style={{ minHeight: 80 }}
              >
                Per E-Mail einladen
              </a>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="w-full rounded-md bg-[#2D3142] px-6 text-lg font-semibold text-white"
              style={{ minHeight: 80 }}
            >
              Teilen oder Link kopieren
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full rounded-md border-2 border-[#2D3142] px-6 text-lg font-semibold text-[#2D3142]"
              style={{ minHeight: 80 }}
            >
              Als Brief drucken
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
