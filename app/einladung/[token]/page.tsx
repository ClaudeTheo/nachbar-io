"use client";

import { useEffect, useState } from "react";

type InfoResponse = {
  expectedOrgName: string;
  expiresAt: string;
};

const PUBLIC_INVITATION_ERROR = "Einladung ungueltig oder abgelaufen.";

type Props = {
  params: Promise<{ token: string }>;
};

export default function EinladungLandingPage({ params }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    async function load() {
      try {
        const res = await fetch(
          `/api/housing/invitations/${encodeURIComponent(token!)}/info`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(PUBLIC_INVITATION_ERROR);
        } else {
          setInfo(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(PUBLIC_INVITATION_ERROR);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const acceptPath = token ? `/einladung/${token}/accept` : "";
  const loginHref = token
    ? `/login?next=${encodeURIComponent(acceptPath)}`
    : "/login";
  const registerHref = token
    ? `/register?next=${encodeURIComponent(acceptPath)}`
    : "/register";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-[#2D3142]">
        Einladung zur QuartierApp
      </h1>

      {loading && (
        <p className="mt-6 text-lg text-gray-600">Einladung wird geprueft...</p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-md bg-red-50 p-6 text-lg text-red-800"
        >
          {error}
        </div>
      )}

      {info && !error && (
        <>
          <p className="mt-6 text-lg text-gray-800">
            Eine Mieterin oder ein Mieter hat Sie als Hausverwaltung{" "}
            <span className="font-semibold">{info.expectedOrgName}</span> zur
            QuartierApp eingeladen.
          </p>
          <p className="mt-2 text-base text-gray-600">
            Einladung gueltig bis:{" "}
            {new Date(info.expiresAt).toLocaleDateString("de-DE")}
          </p>

          <div className="mt-10 space-y-4">
            <a
              href={loginHref}
              className="flex w-full items-center justify-center rounded-md bg-[#4CAF87] px-6 text-lg font-semibold text-white"
              style={{ minHeight: 80 }}
            >
              Anmelden (wenn Sie schon einen Account haben)
            </a>
            <a
              href={registerHref}
              className="flex w-full items-center justify-center rounded-md border-2 border-[#2D3142] px-6 text-lg font-semibold text-[#2D3142]"
              style={{ minHeight: 80 }}
            >
              Account anlegen
            </a>
          </div>

          <p className="mt-8 text-sm text-gray-500">
            Nach dem Login oder der Registrierung wird die Einladung automatisch
            eingeloest.
          </p>
        </>
      )}
    </main>
  );
}
