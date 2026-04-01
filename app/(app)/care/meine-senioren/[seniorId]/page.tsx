// app/(app)/care/meine-senioren/[seniorId]/page.tsx
// Detail-Seite: Medikamente, Check-ins und SOS-Verlauf eines Seniors
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Pill,
  Clock,
  TriangleAlert,
  Plus,
  Activity,
  RefreshCw,
  MessageCircle,
  UserCog,
  Phone,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useCareRole } from "@/lib/care/hooks/useCareRole";
import { createClient } from "@/lib/supabase/client";
import { HeartbeatTimeline } from "@/modules/care/components/checkin/HeartbeatTimeline";
import { usePresence } from "@/lib/video-calls/usePresence";
import { OnlineIndicator } from "@/components/video/OnlineIndicator";
import { CaregiverMemoryEditor } from "@/modules/memory/components/CaregiverMemoryEditor";

interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  status?: string;
}

interface CheckinEntry {
  id: string;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  mood?: string;
}

interface SosEntry {
  id: string;
  category: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

type Tab = "medikamente" | "checkins" | "sos" | "gedaechtnis";

export default function SeniorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seniorId = params.seniorId as string;
  const { role, loading: roleLoading } = useCareRole(seniorId);

  const [seniorName, setSeniorName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("medikamente");
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [lastCheckinStatus, setLastCheckinStatus] = useState<string | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline } = usePresence(seniorId);

  // Zugriffspruefung: Redirect wenn keine Berechtigung
  useEffect(() => {
    if (!roleLoading && role === "none") {
      router.push("/care/meine-senioren");
    }
  }, [role, roleLoading, router]);

  // Senior-Name + Heartbeat-Status laden
  useEffect(() => {
    if (!seniorId) return;
    const supabase = createClient();

    // Name
    supabase
      .from("users")
      .select("display_name")
      .eq("id", seniorId)
      .single()
      .then(({ data }) => {
        setSeniorName(data?.display_name ?? "Senior");
      });

    // Heartbeat-Status
    fetch(`/api/resident/status?resident_id=${seniorId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setLastHeartbeat(data.last_heartbeat ?? null);
          setLastCheckinStatus(data.last_checkin_status ?? null);
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [seniorId]);

  // Daten pro Tab laden
  useEffect(() => {
    if (!seniorId || role === "none") return;

    async function loadData() {
      setLoading(true);
      try {
        if (activeTab === "medikamente") {
          const res = await fetch(
            `/api/care/medications?senior_id=${seniorId}`,
          );
          if (res.ok) setMedications(await res.json());
        } else if (activeTab === "checkins") {
          // 30-Tage-Check-in-Historie laden
          const supabase = createClient();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const { data: ciData } = await supabase
            .from("care_checkins")
            .select("id, status, scheduled_at, completed_at, mood")
            .eq("senior_id", seniorId)
            .gte("scheduled_at", thirtyDaysAgo.toISOString())
            .order("scheduled_at", { ascending: false })
            .limit(100);
          if (ciData) setCheckins(ciData as CheckinEntry[]);
        } else if (activeTab === "sos") {
          const res = await fetch(`/api/care/sos?senior_id=${seniorId}`);
          if (res.ok) setSosAlerts(await res.json());
        }
      } catch {
        /* silent */
      }
      setLoading(false);
    }

    loadData();
  }, [seniorId, activeTab, role]);

  if (roleLoading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (role === "none") return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "medikamente",
      label: "Medikamente",
      icon: <Pill className="h-4 w-4" />,
    },
    {
      key: "checkins",
      label: "Check-ins",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      key: "sos",
      label: "SOS-Verlauf",
      icon: <TriangleAlert className="h-4 w-4" />,
    },
    {
      key: "gedaechtnis",
      label: "Gedächtnis",
      icon: <Brain className="h-4 w-4" />,
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header mit Refresh */}
      <PageHeader
        title={seniorName}
        subtitle={
          role === "relative"
            ? "Angehoerige/r"
            : role === "care_service"
              ? "Pflegedienst"
              : "Helfer"
        }
        backHref="/care/meine-senioren"
        backLabel="Zurück zur Übersicht"
        actions={
          <button
            onClick={async () => {
              setRefreshing(true);
              const res = await fetch(
                `/api/resident/status?resident_id=${seniorId}`,
              );
              if (res.ok) {
                const data = await res.json();
                setLastHeartbeat(data.last_heartbeat ?? null);
                setLastCheckinStatus(data.last_checkin_status ?? null);
              }
              setRefreshing(false);
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            aria-label="Aktualisieren"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        }
      />

      {/* Schnellaktionen */}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            const res = await fetch("/api/caregiver/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resident_id: seniorId }),
            });
            if (res.ok) {
              const data = await res.json();
              router.push(`/messages/${data.conversation_id}`);
            }
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-medium text-anthrazit hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" />
          Nachricht
        </button>
        <button
          onClick={() => router.push(`/call/${seniorId}`)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-medium text-anthrazit hover:bg-muted"
          aria-label={`Videoanruf mit ${seniorName}`}
        >
          <Phone className="h-4 w-4" />
          <span>Anrufen</span>
          <OnlineIndicator isOnline={isOnline} size="sm" />
        </button>
        <Link
          href={`/care/meine-senioren/${seniorId}/edit`}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-medium text-anthrazit hover:bg-muted"
        >
          <UserCog className="h-4 w-4" />
          Bearbeiten
        </Link>
      </div>

      {/* Status-Uebersicht + Heartbeat-Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-quartier-green" />
          <span className="text-sm font-medium text-anthrazit">
            Aktivitaetsstatus
          </span>
        </div>
        {lastHeartbeat && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Letzte Aktivitaet</span>
            <span className="font-medium text-anthrazit">
              {(() => {
                // eslint-disable-next-line react-hooks/purity
                const diff = Date.now() - new Date(lastHeartbeat).getTime();
                const min = Math.floor(diff / 60000);
                const h = Math.floor(diff / 3600000);
                const d = Math.floor(diff / 86400000);
                if (min < 2) return "eben erst";
                if (min < 60) return `vor ${min} Min.`;
                if (h < 24) return `vor ${h}h`;
                return `vor ${d} Tagen`;
              })()}
            </span>
          </div>
        )}
        {lastCheckinStatus && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Letzter Check-in</span>
            <span className="font-medium text-anthrazit">
              {lastCheckinStatus === "ok"
                ? "Alles gut"
                : lastCheckinStatus === "not_well"
                  ? "Geht so"
                  : "Braucht Hilfe"}
            </span>
          </div>
        )}
        <HeartbeatTimeline residentId={seniorId} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-quartier-green text-quartier-green"
                : "border-transparent text-muted-foreground hover:text-anthrazit"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      ) : (
        <>
          {/* Medikamente-Tab */}
          {activeTab === "medikamente" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {medications.length} Medikament
                  {medications.length !== 1 ? "e" : ""}
                </h2>
                {(role === "relative" ||
                  role === "care_service" ||
                  role === "admin") && (
                  <Link
                    href={`/care/medications/new?senior_id=${seniorId}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-1.5 text-sm font-medium text-white hover:bg-quartier-green/90"
                  >
                    <Plus className="h-4 w-4" />
                    Neues Medikament
                  </Link>
                )}
              </div>
              {medications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine Medikamente eingetragen.
                </p>
              ) : (
                medications.map((med) => (
                  <div key={med.id} className="rounded-xl border bg-card p-4">
                    <p className="font-medium text-anthrazit">{med.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {med.dosage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {med.schedule}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Check-ins-Tab */}
          {activeTab === "checkins" && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Check-in-Historie (30 Tage)
              </h2>
              {checkins.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine Check-ins in den letzten 30 Tagen.
                </p>
              ) : (
                checkins.map((ci) => (
                  <div
                    key={ci.id}
                    className="rounded-xl border bg-card p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-anthrazit">
                        {new Date(ci.scheduled_at).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {ci.mood && (
                        <p className="text-xs text-muted-foreground">
                          Stimmung: {ci.mood}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        ci.completed_at
                          ? "bg-quartier-green/10 text-quartier-green"
                          : ci.status === "missed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {ci.completed_at
                        ? "Erledigt"
                        : ci.status === "missed"
                          ? "Verpasst"
                          : "Ausstehend"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SOS-Tab */}
          {activeTab === "sos" && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                SOS-Verlauf
              </h2>
              {sosAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine SOS-Alarme vorhanden.
                </p>
              ) : (
                sosAlerts.map((sos) => (
                  <div key={sos.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-anthrazit capitalize">
                        {sos.category.replace(/_/g, " ")}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          sos.status === "resolved"
                            ? "bg-quartier-green/10 text-quartier-green"
                            : sos.status === "cancelled"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {sos.status === "resolved"
                          ? "Geloest"
                          : sos.status === "cancelled"
                            ? "Abgebrochen"
                            : "Aktiv"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(sos.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Gedaechtnis-Tab */}
          {activeTab === "gedaechtnis" && (
            <CaregiverMemoryEditor
              seniorId={seniorId}
              seniorName={seniorName}
            />
          )}
        </>
      )}
    </div>
  );
}
