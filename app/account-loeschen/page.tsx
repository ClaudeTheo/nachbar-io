"use client";

// Oeffentliche Web-Loeschseite (Google Play Store Policy)
// Nutzer koennen ihr Konto auch ohne App loeschen

import { useState } from "react";
import Link from "next/link";
import { Mail, Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

type Step = "email" | "otp" | "confirm" | "done";

export default function AccountLoeschenPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestOtp() {
    if (!email.trim() || !email.includes("@")) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), action: "request" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Fehler beim Senden des Codes. Bitte versuchen Sie es später erneut.");
        setLoading(false);
        return;
      }

      setStep("otp");
    } catch {
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      setError("Bitte geben Sie den 6-stelligen Code ein.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp, action: "confirm" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Ungültiger oder abgelaufener Code.");
        setLoading(false);
        return;
      }

      setStep("done");
    } catch {
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#2D3142] mb-2">Konto löschen</h1>
      <p className="text-gray-500 mb-8">
        Hier können Sie Ihr QuartierApp-Konto und alle zugehörigen Daten löschen.
      </p>

      {/* Schritt 1: E-Mail eingeben */}
      {step === "email" && (
        <section className="rounded-xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="font-semibold text-[#2D3142]">Löschung beantragen</h2>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                <p className="mt-1">Alle Ihre Daten werden innerhalb von 30 Tagen unwiderruflich gelöscht: Profil, Beiträge, Marktplatz-Anzeigen, Nachrichten und Bewertungen.</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="delete-email" className="block text-sm font-medium text-[#2D3142] mb-1">
              E-Mail-Adresse Ihres QuartierApp-Kontos
            </label>
            <input
              id="delete-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleRequestOtp}
            disabled={loading || !email.trim()}
            className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Code wird gesendet...
              </span>
            ) : (
              "Bestätigungscode anfordern"
            )}
          </button>
        </section>
      )}

      {/* Schritt 2: OTP eingeben */}
      {step === "otp" && (
        <section className="rounded-xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[#2D3142]">Bestätigungscode eingeben</h2>
              <p className="text-sm text-gray-500">Wir haben einen Code an {email} gesendet.</p>
            </div>
          </div>

          <div>
            <label htmlFor="delete-otp" className="block text-sm font-medium text-[#2D3142] mb-1">
              6-stelliger Bestätigungscode
            </label>
            <input
              id="delete-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird geprüft...
              </span>
            ) : (
              "Konto unwiderruflich löschen"
            )}
          </button>

          <button
            onClick={() => { setStep("email"); setError(null); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Zurück
          </button>
        </section>
      )}

      {/* Schritt 3: Fertig */}
      {step === "done" && (
        <section className="rounded-xl border bg-white p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h2 className="font-semibold text-[#2D3142]">Löschung beantragt</h2>
          <p className="text-sm text-gray-600">
            Ihr Konto und alle zugehörigen Daten werden innerhalb von 30 Tagen gelöscht.
            Gesetzliche Aufbewahrungspflichten (z. B. steuerrelevante Daten) bleiben davon unberührt.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[#4CAF87] px-6 py-3 text-sm font-medium text-white hover:bg-[#3d9a74] transition-colors"
          >
            Zur Startseite
          </Link>
        </section>
      )}

      {/* Hinweise */}
      <section className="mt-8 space-y-3 text-xs text-gray-400">
        <p>
          Die Löschung erfolgt gemäß DSGVO Art. 17 (Recht auf Löschung). Gesetzliche
          Aufbewahrungspflichten gemäß HGB §257 und AO §147 bleiben bestehen.
        </p>
        <p>
          Bei Fragen wenden Sie sich an{" "}
          <a href="mailto:support@quartierapp.de" className="underline">
            support@quartierapp.de
          </a>
        </p>
      </section>

      {/* Footer-Links */}
      <nav className="mt-8 flex gap-4 text-xs text-gray-400">
        <Link href="/datenschutz" className="underline">Datenschutz</Link>
        <Link href="/impressum" className="underline">Impressum</Link>
        <Link href="/support" className="underline">Support</Link>
      </nav>
    </main>
  );
}
