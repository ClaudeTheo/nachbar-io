"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// --- Typen ---

interface KPIs {
  totalProfiles: number;
  consentsPending: number;
  consentsGranted: number;
  consentsRevoked: number;
}

// Normalisiertes Format von der API (serverseitig kanonischer Consent gewaehlt)
interface ConsentEntry {
  userId: string;
  firstName: string;
  quarterName: string;
  ageGroup: string | null;
  accessLevel: string | null;
  consentStatus: string;
  grantedAt: string | null;
  tokenSendCount: number;
}

interface SuspendedItem {
  id: string;
  action: string;
  target_id: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

interface ModerationData {
  flaggedCount: number;
  suspendedItems: SuspendedItem[];
}

interface OverviewResponse {
  kpis: KPIs;
  consents: ConsentEntry[];
  moderation: ModerationData;
}

// --- Hilfsfunktionen ---

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  granted: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600",
  none: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend",
  granted: "Erteilt",
  revoked: "Widerrufen",
  expired: "Abgelaufen",
  none: "Keine",
};

const ACCESS_LABELS: Record<string, string> = {
  basis: "Basis",
  erweitert: "Erweitert",
  freigeschaltet: "Freigeschaltet",
};

const AGE_LABELS: Record<string, string> = {
  u16: "Unter 16",
  "16_17": "16\u201317",
};

// --- Hauptkomponente ---

export default function YouthAdmin() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/youth/overview");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const json: OverviewResponse = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error("Jugendschutz-Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRestore(itemId: string) {
    setRestoringId(itemId);
    try {
      const res = await fetch("/api/admin/youth/moderation/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error("Fehler beim Wiederherstellen");
      toast.success("Inhalt wiederhergestellt");
      await loadData();
    } catch {
      toast.error("Wiederherstellen fehlgeschlagen");
    } finally {
      setRestoringId(null);
    }
  }

  // --- Loading / Error ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Keine Daten verfuegbar
      </div>
    );
  }

  const { kpis, consents, moderation } = data;

  // --- Client-side Filterung ---
  const filteredConsents = consents.filter((entry) => {
    if (statusFilter !== "all" && entry.consentStatus !== statusFilter) return false;
    if (ageFilter !== "all") {
      if (ageFilter === "unter16" && entry.ageGroup !== "u16") return false;
      if (ageFilter === "16-17" && entry.ageGroup !== "16_17") return false;
    }
    return true;
  });

  const showModeration =
    moderation.flaggedCount > 0 || moderation.suspendedItems.length > 0;

  return (
    <div className="space-y-6">
      {/* KPI-Karten */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="Registriert"
          value={kpis.totalProfiles}
          color="border-blue-200 bg-blue-50"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="Ausstehend"
          value={kpis.consentsPending}
          color="border-amber-200 bg-amber-50"
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          label="Erteilt"
          value={kpis.consentsGranted}
          color="border-green-200 bg-green-50"
        />
        <KpiCard
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          label="Widerrufen"
          value={kpis.consentsRevoked}
          color="border-red-200 bg-red-50"
        />
      </div>

      {/* Filter-Leiste */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="granted">Erteilt</SelectItem>
            <SelectItem value="revoked">Widerrufen</SelectItem>
            <SelectItem value="expired">Abgelaufen</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ageFilter} onValueChange={(v) => v && setAgeFilter(v)}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Alter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Alter</SelectItem>
            <SelectItem value="unter16">Unter 16</SelectItem>
            <SelectItem value="16-17">16–17</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Consent-Liste */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Einwilligungen ({filteredConsents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredConsents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Keine Eintraege gefunden
            </p>
          ) : (
            filteredConsents.map((entry, idx) => (
                <div
                  key={entry.userId ?? idx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-anthrazit truncate">
                      {entry.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.quarterName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {AGE_LABELS[entry.ageGroup ?? ""] ?? entry.ageGroup ?? "–"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ACCESS_LABELS[entry.accessLevel ?? ""] ?? entry.accessLevel ?? "–"}
                    </Badge>
                    <Badge className={`text-xs ${STATUS_COLORS[entry.consentStatus] ?? STATUS_COLORS.none}`}>
                      {STATUS_LABELS[entry.consentStatus] ?? entry.consentStatus}
                    </Badge>
                    {entry.grantedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.grantedAt).toLocaleDateString("de-DE")}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      SMS {entry.tokenSendCount}/3
                    </span>
                  </div>
                </div>
              ))

          )}
        </CardContent>
      </Card>

      {/* Moderation */}
      {showModeration && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {moderation.flaggedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{moderation.flaggedCount} markierte Inhalte</span>
              </div>
            )}

            {moderation.suspendedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    Gesperrt: {item.target_id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-red-600">
                    {new Date(item.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(item.id)}
                  disabled={restoringId === item.id}
                >
                  {restoringId === item.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Wiederherstellen
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Hilfskomponenten ---

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className={color}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="mt-1 text-2xl font-bold text-anthrazit">{value}</p>
      </CardContent>
    </Card>
  );
}
