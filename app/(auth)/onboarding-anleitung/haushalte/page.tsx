import { createClient } from "@supabase/supabase-js";
import { PrintButton } from "./PrintButton";
import Link from "next/link";

const PILOT_TOKEN = process.env.PILOT_ADMIN_TOKEN || "pilot-2026";

interface Household {
  id: string;
  street_name: string;
  house_number: string;
  invite_code: string;
}

export default async function HaushalteQrPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; street?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;
  const streetFilter = params.street;

  if (token !== PILOT_TOKEN) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-red-600">Zugriff verweigert. Bitte Token angeben.</p>
      </div>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("households")
    .select("id, street_name, house_number, invite_code, quarter:quarters!inner(invite_prefix)")
    .eq("quarters.invite_prefix", "PILOT")
    .order("street_name")
    .order("house_number");

  if (streetFilter) {
    query = query.eq("street_name", streetFilter);
  }

  const { data: households, error } = await query;

  if (error || !households) {
    return <div className="p-8 text-red-600">Fehler: {error?.message}</div>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nachbar-io.vercel.app";

  // Invite-Code formatieren: PILOT-XXXX-XXXX (bereits im Format, aber sicherheitshalber)
  function displayCode(code: string): string {
    // Code ist bereits im Format PILOT-XXXX-XXXX
    if (code.startsWith("PILOT-")) return code;
    // Fallback: Rohformat anzeigen
    return code;
  }

  return (
    <div className="mx-auto max-w-[210mm] px-4 py-8 print:p-0">
      {/* Screen-only Header */}
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-anthrazit">QR-Code-Karten für Pilot-Haushalte</h1>
        <p className="mt-1 text-muted-foreground">{households.length} Haushalte gefunden</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrintButton />
          <Link
            href={`?token=${PILOT_TOKEN}&street=Purkersdorfer+Straße`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Purkersdorfer Str.
          </Link>
          <Link
            href={`?token=${PILOT_TOKEN}&street=Sanarystraße`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Sanarystraße
          </Link>
          <Link
            href={`?token=${PILOT_TOKEN}&street=Oberer+Rebberg`}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Oberer Rebberg
          </Link>
          {streetFilter && (
            <Link
              href={`?token=${PILOT_TOKEN}`}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Filter zurücksetzen
            </Link>
          )}
        </div>
      </div>

      {/* Karten — 2 pro Seite */}
      <div className="space-y-6 print:space-y-0">
        {(households as Household[]).map((h, i) => (
          <div
            key={h.id}
            className={`rounded-xl border-2 border-dashed border-gray-300 p-8 text-center print:rounded-none print:border-solid print:border-gray-400 ${
              i % 2 === 1 ? "print:break-after-page" : ""
            }`}
            style={{ minHeight: "45vh" }}
          >
            {/* Nachbar.io Header */}
            <p className="mb-1 text-sm font-medium tracking-wider text-quartier-green uppercase">
              QuartierApp
            </p>
            <h2 className="mb-1 text-2xl font-bold text-anthrazit">
              Willkommen in der Nachbarschaft!
            </h2>
            <p className="mb-6 text-base text-muted-foreground">
              {h.street_name} {h.house_number}
            </p>

            {/* QR Code */}
            <div className="mx-auto mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr?code=${encodeURIComponent(h.invite_code)}&size=400`}
                alt={`QR-Code für ${h.street_name} ${h.house_number}`}
                width={200}
                height={200}
                className="print:h-[180px] print:w-[180px]"
              />
            </div>

            {/* Code */}
            <p className="mb-4 font-mono text-2xl font-bold tracking-widest text-quartier-green">
              {displayCode(h.invite_code)}
            </p>

            {/* Kurzanleitung */}
            <div className="mx-auto max-w-sm text-left text-sm text-gray-600">
              <p className="mb-2 font-semibold text-anthrazit">So geht&apos;s:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>QR-Code mit der Handy-Kamera scannen</li>
                <li>Name und E-Mail eingeben</li>
                <li>Bestätigungs-E-Mail öffnen — fertig!</li>
              </ol>
              <p className="mt-3 text-xs text-gray-400">
                Oder im Browser: {appUrl}/register
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
