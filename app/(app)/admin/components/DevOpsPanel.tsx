"use client";

import { useEffect, useState } from "react";
import {
  CircleCheckBig,
  CircleX,
  TriangleAlert,
  RefreshCw,
  Play,
  Clock,
  Server,
  Shield,
  GitCommit,
  Database,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnvVar {
  label: string;
  key: string;
  isSet: boolean;
  critical: boolean;
  group: string;
}

interface BuildInfo {
  nodeVersion: string;
  environment: string;
  commitSha: string | null;
  commitMessage: string | null;
  region: string | null;
}

interface CronJob {
  label: string;
  path: string;
  schedule: string;
}

interface MigrationTypeStatus {
  type: string;
  status: "ok" | "blocked";
}

interface MigrationStatus {
  migrationApplied: boolean;
  migration: string;
  summary: string;
  types: MigrationTypeStatus[];
  sqlEditorUrl: string;
  migrationSql: string;
}

const CRON_JOBS: CronJob[] = [
  { label: "Einladungen ablaufen", path: "/api/cron/expire-invitations", schedule: "Taeglich" },
  { label: "Care: Eskalation", path: "/api/care/cron/escalation", schedule: "Taeglich 09:00" },
  { label: "Care: Check-in", path: "/api/care/cron/checkin", schedule: "Taeglich 08:00" },
  { label: "Care: Medikamente", path: "/api/care/cron/medications", schedule: "Taeglich 07:00" },
  { label: "Care: Termine", path: "/api/care/cron/appointments", schedule: "Taeglich 06:00" },
];

export function DevOpsPanel() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [cronResults, setCronResults] = useState<Record<string, { status: number; time: number }>>({});
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  async function loadEnvStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/env-status");
      if (res.ok) {
        const data = await res.json();
        setEnvVars(data.vars || []);
        setBuildInfo(data.buildInfo || null);
      }
    } catch {
      // Fehler still ignorieren
    }
    setLoading(false);
  }

  async function checkMigrationStatus() {
    setMigrationLoading(true);
    try {
      const res = await fetch("/api/admin/migration-status");
      if (res.ok) {
        const data = await res.json();
        setMigrationStatus(data);
      }
    } catch {
      // Fehler still ignorieren
    }
    setMigrationLoading(false);
  }

  useEffect(() => {
    loadEnvStatus();
    checkMigrationStatus();
  }, []);

  async function copySql() {
    if (migrationStatus?.migrationSql) {
      await navigator.clipboard.writeText(migrationStatus.migrationSql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    }
  }

  async function triggerCron(path: string) {
    setCronRunning(path);
    // eslint-disable-next-line react-hooks/purity -- triggerCron ist ein Event-Handler, nicht waehrend Render aufgerufen
    const start = Date.now();
    try {
      const res = await fetch(path, { method: "POST" });
      setCronResults((prev) => ({
        ...prev,
        [path]: { status: res.status, time: Date.now() - start },
      }));
    } catch {
      setCronResults((prev) => ({
        ...prev,
        [path]: { status: 0, time: Date.now() - start },
      }));
    }
    setCronRunning(null);
  }

  // Env-Vars nach Gruppe gruppieren
  const groupedVars = envVars.reduce<Record<string, EnvVar[]>>((acc, v) => {
    if (!acc[v.group]) acc[v.group] = [];
    acc[v.group].push(v);
    return acc;
  }, {});

  const setCount = envVars.filter((v) => v.isSet).length;
  const criticalMissing = envVars.filter((v) => v.critical && !v.isSet);

  return (
    <div className="space-y-6">
      {/* Build-Info */}
      {buildInfo && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-anthrazit">
            <Server className="h-4 w-4 text-quartier-green" />
            Build-Informationen
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoBox label="Environment" value={buildInfo.environment} />
            <InfoBox label="Node.js" value={buildInfo.nodeVersion} />
            <InfoBox label="Region" value={buildInfo.region || "lokal"} />
            <InfoBox
              label="Commit"
              value={buildInfo.commitSha ? buildInfo.commitSha.slice(0, 7) : "lokal"}
              icon={<GitCommit className="h-3 w-3" />}
            />
          </div>
          {buildInfo.commitMessage && (
            <p className="mt-2 text-[10px] text-muted-foreground truncate">
              Letzte Aenderung: {buildInfo.commitMessage}
            </p>
          )}
        </div>
      )}

      {/* Datenbank-Migrationen */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-anthrazit">
            <Database className="h-4 w-4 text-quartier-green" />
            Datenbank-Migrationen
          </h3>
          <Button variant="ghost" size="sm" onClick={checkMigrationStatus} disabled={migrationLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${migrationLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {migrationLoading && !migrationStatus ? (
          <div className="py-4 text-center text-sm text-muted-foreground">Pruefe Migrations-Status...</div>
        ) : migrationStatus ? (
          <div className="space-y-3">
            {/* Status-Banner */}
            <div className={`rounded-lg p-3 text-xs ${
              migrationStatus.migrationApplied
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {migrationStatus.migrationApplied ? (
                  <CircleCheckBig className="h-4 w-4" />
                ) : (
                  <TriangleAlert className="h-4 w-4" />
                )}
                {migrationStatus.summary}
              </div>
            </div>

            {/* Typ-Status-Grid */}
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
              {migrationStatus.types.map((t) => (
                <div
                  key={t.type}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono ${
                    t.status === "ok"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {t.status === "ok" ? (
                    <CircleCheckBig className="h-2.5 w-2.5 shrink-0" />
                  ) : (
                    <CircleX className="h-2.5 w-2.5 shrink-0" />
                  )}
                  {t.type}
                </div>
              ))}
            </div>

            {/* Aktions-Buttons (nur wenn Migration fehlt) */}
            {!migrationStatus.migrationApplied && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={copySql} className="text-xs">
                  <Copy className="mr-1 h-3 w-3" />
                  {sqlCopied ? "Kopiert!" : "SQL kopieren"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => window.open(migrationStatus.sqlEditorUrl, "_blank")}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  SQL Editor oeffnen
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Status konnte nicht geladen werden.
          </div>
        )}
      </div>

      {/* Umgebungsvariablen */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-anthrazit">
            <Shield className="h-4 w-4 text-quartier-green" />
            Umgebungsvariablen
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {setCount}/{envVars.length} gesetzt
            </span>
            <Button variant="ghost" size="sm" onClick={loadEnvStatus} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Warnung bei fehlenden kritischen Vars */}
        {criticalMissing.length > 0 && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <strong>Achtung:</strong> {criticalMissing.length} kritische Variable(n) fehlen:{" "}
            {criticalMissing.map((v) => v.label).join(", ")}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Laden...</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedVars).map(([group, vars]) => (
              <div key={group}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-1">
                  {vars.map((v) => (
                    <div
                      key={v.key}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/30"
                    >
                      {v.isSet ? (
                        <CircleCheckBig className="h-3.5 w-3.5 shrink-0 text-green-600" />
                      ) : v.critical ? (
                        <CircleX className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                      <span className="flex-1 font-medium">{v.label}</span>
                      <code className="text-[10px] text-muted-foreground font-mono">{v.key}</code>
                      {v.critical && (
                        <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] font-bold text-red-600">
                          KRITISCH
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cron-Jobs */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-anthrazit">
          <Clock className="h-4 w-4 text-quartier-green" />
          Cron-Jobs
        </h3>
        <div className="text-[10px] text-muted-foreground mb-3">
          Vercel Hobby-Plan: Cron-Jobs laufen nur einmal taeglich. Hier koennen Sie diese manuell ausloesen.
        </div>
        <div className="space-y-2">
          {CRON_JOBS.map((cron) => {
            const result = cronResults[cron.path];
            return (
              <div
                key={cron.path}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium">{cron.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{cron.path}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{cron.schedule}</span>
                {result && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    result.status >= 200 && result.status < 300
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}>
                    {result.status} ({result.time}ms)
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cronRunning === cron.path}
                  onClick={() => triggerCron(cron.path)}
                  className="shrink-0"
                >
                  {cronRunning === cron.path ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="flex items-center gap-1 text-xs font-medium text-anthrazit">
        {icon}
        {value}
      </p>
    </div>
  );
}
