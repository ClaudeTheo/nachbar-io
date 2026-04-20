"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "pending" | "success" | "not-found" | "error";

type Props = {
  params: Promise<{ token: string }>;
};

export default function EinladungAcceptPage({ params }: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (!cancelled) setToken(p.token);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/housing/invitations/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) return;

        if (res.status === 401) {
          const next = `/einladung/${token}/accept`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setStatus("success");
          setMessage(null);
          return;
        }

        if (res.status === 404) {
          setStatus("not-found");
          setMessage(data.error ?? "Einladung nicht gefunden oder abgelaufen");
          return;
        }

        setStatus("error");
        setMessage(data.error ?? "Annahme fehlgeschlagen");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Netzwerk-Fehler");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-[#2D3142]">
        Einladung wird angenommen
      </h1>

      {status === "pending" && (
        <p className="mt-6 text-lg text-gray-600">
          Einladung wird eingeloest...
        </p>
      )}

      {status === "success" && (
        <div
          role="status"
          className="mt-6 rounded-md bg-green-50 p-6 text-lg text-green-900"
        >
          Einladung erfolgreich angenommen — Sie sind jetzt mit dem Haushalt
          Ihrer Mieterin/Ihres Mieters verbunden.
          <p className="mt-4">
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-[#4CAF87] px-6 text-lg font-semibold text-white"
              style={{ minHeight: 80 }}
            >
              Zur Startseite
            </a>
          </p>
        </div>
      )}

      {(status === "not-found" || status === "error") && message && (
        <div
          role="alert"
          className="mt-6 rounded-md bg-red-50 p-6 text-lg text-red-800"
        >
          {message}
        </div>
      )}
    </main>
  );
}
