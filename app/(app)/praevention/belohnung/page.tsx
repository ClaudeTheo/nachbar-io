"use client";

// /praevention/belohnung — Ergebnis-Seite nach Kursabschluss
// Zeigt Belohnungsstufe (Bronze/Silber/Gold) + Trial-Status fuer Angehoerige
// Design-Ref: docs/plans/2026-04-05-kursbelohnung-plus-trial-design.md

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  Star,
  Users,
  ChevronRight,
  Trophy,
  ClipboardList,
  MessageSquare,
} from "lucide-react";

type RewardTier = "none" | "bronze" | "silver" | "gold";

interface RewardResult {
  tier: RewardTier;
  monthsGranted: number;
  caregiversGranted: number;
  upgradeHint?: string;
}

const TIER_CONFIG: Record<
  Exclude<RewardTier, "none">,
  { label: string; icon: string; color: string; bg: string; months: number }
> = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    color: "text-amber-700",
    bg: "bg-amber-50",
    months: 1,
  },
  silver: {
    label: "Silber",
    icon: "🥈",
    color: "text-gray-600",
    bg: "bg-gray-50",
    months: 2,
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    months: 3,
  },
};

function BelohnungContent() {
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get("enrollmentId");

  const [result, setResult] = useState<RewardResult | null>(null);
  const [tierInfo, setTierInfo] = useState<{
    tier: RewardTier;
    upgradeHint?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let eid = enrollmentId;

        // Wenn keine enrollmentId: eigene Enrollment suchen
        if (!eid) {
          const progRes = await fetch("/api/prevention/progress");
          if (!progRes.ok) {
            setError("Kein abgeschlossener Kurs gefunden");
            return;
          }
          const progress = await progRes.json();
          eid = progress.enrollment?.id;
        }

        if (!eid) {
          setError("Keine Einschreibung gefunden");
          return;
        }

        // Stufe berechnen
        const tierRes = await fetch(
          `/api/prevention/reward?enrollmentId=${eid}`,
        );
        if (!tierRes.ok) {
          setError("Fehler beim Berechnen der Belohnung");
          return;
        }
        const tierData = await tierRes.json();
        setTierInfo(tierData);
      } catch {
        setError("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [enrollmentId]);

  const handleGrant = async () => {
    if (!tierInfo || tierInfo.tier === "none") return;
    setGranting(true);

    try {
      let eid = enrollmentId;
      if (!eid) {
        const progRes = await fetch("/api/prevention/progress");
        const progress = await progRes.json();
        eid = progress.enrollment?.id;
      }

      const res = await fetch("/api/prevention/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: eid }),
      });

      if (res.ok) {
        setResult(await res.json());
      } else {
        const data = await res.json();
        setError(data.error || "Fehler beim Vergeben");
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <Gift className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="mb-4 text-gray-600">{error}</p>
        <Link href="/praevention" className="text-emerald-600 underline">
          Zurueck
        </Link>
      </div>
    );
  }

  // Nach Vergabe: Ergebnis
  if (result) {
    const config = result.tier !== "none" ? TIER_CONFIG[result.tier] : null;

    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/praevention"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">
            Belohnung aktiviert
          </h1>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 text-center shadow-lg">
          <div className="mb-4 text-5xl">{config?.icon ?? "🎉"}</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {config?.label ?? "Kurs"} erreicht!
          </h2>

          {result.caregiversGranted > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-gray-600">
                <strong>{result.caregiversGranted} Angehoerige</strong> erhalten{" "}
                <strong>
                  {result.monthsGranted}{" "}
                  {result.monthsGranted === 1 ? "Monat" : "Monate"}
                </strong>{" "}
                Nachbar Plus geschenkt!
              </p>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-sm text-emerald-700">
                  Ihre Angehoerigen koennen jetzt Heartbeat-Status,
                  Check-in-Verlauf und Video-Anrufe nutzen.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-amber-50 p-4">
              <Users className="mx-auto mb-2 h-8 w-8 text-amber-600" />
              <p className="text-sm text-amber-800">
                {result.upgradeHint ||
                  "Laden Sie einen Angehoerigen ein, damit dieser von Ihrem Kursabschluss profitiert."}
              </p>
              <Link
                href="/care/einladung"
                className="mt-2 inline-block text-sm font-medium text-amber-700 underline"
              >
                Angehoerigen einladen →
              </Link>
            </div>
          )}
        </div>

        {/* Upgrade-Hinweis */}
        {result.tier !== "gold" && (
          <UpgradeHints
            currentTier={result.tier}
            enrollmentId={enrollmentId}
          />
        )}
      </div>
    );
  }

  // Vor Vergabe: Stufe anzeigen + Button
  const tier = tierInfo?.tier ?? "none";
  const config = tier !== "none" ? TIER_CONFIG[tier] : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/praevention" className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">
          Ihre Kursbelohnung
        </h1>
      </div>

      {tier === "none" ? (
        <div className="rounded-2xl bg-gray-50 p-6 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-600">
            Schliessen Sie Ihren Kurs ab (mind. 80% Anwesenheit), um eine
            Belohnung zu erhalten.
          </p>
        </div>
      ) : (
        <>
          {/* Stufen-Anzeige */}
          <div
            className={`rounded-2xl border-2 ${config!.bg} p-6 text-center shadow-lg`}
          >
            <div className="mb-3 text-5xl">{config!.icon}</div>
            <h2
              className={`mb-1 text-xl font-bold ${config!.color}`}
            >
              {config!.label}-Stufe erreicht!
            </h2>
            <p className="mb-4 text-gray-600">
              Ihre Angehoerigen erhalten {config!.months}{" "}
              {config!.months === 1 ? "Monat" : "Monate"} Nachbar Plus
              geschenkt.
            </p>

            <button
              onClick={handleGrant}
              disabled={granting}
              className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
              style={{ minHeight: "80px" }}
            >
              {granting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Wird vergeben...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Gift className="h-5 w-5" />
                  Belohnung aktivieren
                </span>
              )}
            </button>
          </div>

          {/* Upgrade-Hinweis */}
          {tier !== "gold" && (
            <UpgradeHints currentTier={tier} enrollmentId={enrollmentId} />
          )}

          {/* 3 Stufen erklaeren */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">
              So funktioniert es
            </h3>
            <StepCard
              icon={<Trophy className="h-5 w-5 text-amber-700" />}
              title="Bronze — 1 Monat Plus"
              desc="Kurs abschliessen (min. 80%)"
              active={tier === "bronze" || tier === "silver" || tier === "gold"}
            />
            <StepCard
              icon={<ClipboardList className="h-5 w-5 text-gray-500" />}
              title="Silber — 2 Monate Plus"
              desc="+ Abschluss-Fragebogen ausfuellen"
              active={tier === "silver" || tier === "gold"}
            />
            <StepCard
              icon={<MessageSquare className="h-5 w-5 text-yellow-600" />}
              title="Gold — 3 Monate Plus"
              desc="+ Kursbewertung schreiben"
              active={tier === "gold"}
            />
          </div>
        </>
      )}
    </div>
  );
}

function UpgradeHints({
  currentTier,
  enrollmentId,
}: {
  currentTier: RewardTier;
  enrollmentId: string | null;
}) {
  return (
    <div className="mt-4 space-y-2">
      {currentTier === "bronze" && (
        <Link
          href={`/praevention/dashboard/evaluation${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}
          className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Auf Silber upgraden
              </p>
              <p className="text-xs text-gray-500">
                PSS-10 Abschluss-Fragebogen ausfuellen → 2 Monate Plus
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      )}

      {(currentTier === "bronze" || currentTier === "silver") && (
        <Link
          href={`/praevention/bewertung${enrollmentId ? `?enrollmentId=${enrollmentId}` : ""}`}
          className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {currentTier === "silver"
                  ? "Auf Gold upgraden"
                  : "Bewertung schreiben"}
              </p>
              <p className="text-xs text-gray-500">
                Kursbewertung abgeben →{" "}
                {currentTier === "silver" ? "3" : "bis zu 3"} Monate Plus
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      )}
    </div>
  );
}

function StepCard({
  icon,
  title,
  desc,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 ${active ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 opacity-60"}`}
    >
      {icon}
      <div>
        <p
          className={`text-sm font-medium ${active ? "text-gray-800" : "text-gray-500"}`}
        >
          {title}
        </p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      {active && (
        <span className="ml-auto text-xs font-medium text-emerald-600">✓</span>
      )}
    </div>
  );
}

export default function BelohnungPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <BelohnungContent />
    </Suspense>
  );
}
