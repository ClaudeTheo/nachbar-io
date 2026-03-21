"use client";

import { useState } from "react";
import { Play, Clock, CircleCheckBig, CircleX, TriangleAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiRoute {
  method: "GET" | "POST";
  path: string;
  label: string;
  requiresBody: boolean;
  sampleBody?: string;
}

interface TestResult {
  id: number;
  method: string;
  path: string;
  status: number;
  statusText: string;
  responseTime: number;
  body: string;
  timestamp: Date;
  error?: string;
}

const API_ROUTES: ApiRoute[] = [
  // Admin
  { method: "GET", path: "/api/admin/health", label: "System Health Check", requiresBody: false },
  { method: "GET", path: "/api/admin/broadcast", label: "Broadcast-Verlauf", requiresBody: false },
  { method: "GET", path: "/api/admin/db-overview", label: "Datenbank-Uebersicht", requiresBody: false },
  { method: "GET", path: "/api/admin/env-status", label: "Umgebungsvariablen-Status", requiresBody: false },
  // News
  { method: "POST", path: "/api/news/scrape", label: "News-Scraper starten", requiresBody: false },
  { method: "POST", path: "/api/news/aggregate", label: "News-Aggregation starten", requiresBody: false },
  { method: "GET", path: "/api/news/rss", label: "RSS-Feed abrufen", requiresBody: false },
  // Device
  { method: "GET", path: "/api/device/status", label: "Device-Status (Companion)", requiresBody: false },
  // Care
  { method: "GET", path: "/api/care/stats", label: "Care-Statistiken", requiresBody: false },
  { method: "GET", path: "/api/care/stats/overview", label: "Care-Uebersicht", requiresBody: false },
  // QR
  { method: "GET", path: "/api/qr?code=TEST-CODE&size=200", label: "QR-Code generieren (Test)", requiresBody: false },
  // User
  { method: "GET", path: "/api/user/export", label: "DSGVO-Datenexport", requiresBody: false },
  // Push (Broadcast)
  {
    method: "POST",
    path: "/api/admin/broadcast",
    label: "Broadcast senden (Test)",
    requiresBody: true,
    sampleBody: JSON.stringify({ title: "Test-Broadcast", body: "Dies ist ein Test.", audience: "all", urgency: "normal" }, null, 2),
  },
  // Reputation
  {
    method: "POST",
    path: "/api/reputation/recompute",
    label: "Reputation neu berechnen",
    requiresBody: true,
    sampleBody: JSON.stringify({ userId: "USER_ID_HIER" }, null, 2),
  },
];

export function ApiTester() {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute>(API_ROUTES[0]);
  const [requestBody, setRequestBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  async function runTest() {
    setLoading(true);
    const startTime = Date.now();

    try {
      const fetchOptions: RequestInit = {
        method: selectedRoute.method,
        headers: { "Content-Type": "application/json" },
      };

      if (selectedRoute.method === "POST" && requestBody.trim()) {
        fetchOptions.body = requestBody;
      }

      const response = await fetch(selectedRoute.path, fetchOptions);
      const responseTime = Date.now() - startTime;

      let body: string;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        const json = await response.json();
        body = JSON.stringify(json, null, 2);
      } else {
        const text = await response.text();
        body = text.length > 3000 ? text.slice(0, 3000) + "\n...(abgeschnitten)" : text;
      }

      const result: TestResult = {
        id: Date.now(),
        method: selectedRoute.method,
        path: selectedRoute.path,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        body,
        timestamp: new Date(),
      };

      setResults((prev) => [result, ...prev].slice(0, 15));
      setExpandedResult(result.id);
    } catch (err) {
      const responseTime = Date.now() - startTime;
      const result: TestResult = {
        id: Date.now(),
        method: selectedRoute.method,
        path: selectedRoute.path,
        status: 0,
        statusText: "Netzwerkfehler",
        responseTime,
        body: "",
        timestamp: new Date(),
        error: err instanceof Error ? err.message : "Unbekannter Fehler",
      };
      setResults((prev) => [result, ...prev].slice(0, 15));
      setExpandedResult(result.id);
    }

    setLoading(false);
  }

  function handleRouteChange(path: string) {
    const route = API_ROUTES.find((r) => r.path === path);
    if (route) {
      setSelectedRoute(route);
      if (route.requiresBody && route.sampleBody) {
        setRequestBody(route.sampleBody);
      } else {
        setRequestBody("");
      }
    }
  }

  function getStatusColor(status: number) {
    if (status === 0) return "text-red-600 bg-red-50";
    if (status >= 200 && status < 300) return "text-green-700 bg-green-50";
    if (status >= 400 && status < 500) return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
  }

  function getStatusIcon(status: number) {
    if (status === 0) return <CircleX className="h-4 w-4 text-red-500" />;
    if (status >= 200 && status < 300) return <CircleCheckBig className="h-4 w-4 text-green-600" />;
    if (status >= 400 && status < 500) return <TriangleAlert className="h-4 w-4 text-amber-500" />;
    return <CircleX className="h-4 w-4 text-red-500" />;
  }

  return (
    <div className="space-y-4">
      {/* Request Builder */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-anthrazit">API-Endpunkt testen</h3>

        <div className="flex gap-2">
          <select
            value={selectedRoute.path}
            onChange={(e) => handleRouteChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {API_ROUTES.map((route) => (
              <option key={`${route.method}-${route.path}-${route.label}`} value={route.path}>
                {route.method} — {route.label}
              </option>
            ))}
          </select>
          <Button
            onClick={runTest}
            disabled={loading}
            className="bg-quartier-green hover:bg-quartier-green-dark shrink-0"
          >
            {loading ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-1.5">Senden</span>
          </Button>
        </div>

        {/* Pfad-Anzeige */}
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
            selectedRoute.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
          }`}>
            {selectedRoute.method}
          </span>
          <code className="text-xs text-muted-foreground font-mono">{selectedRoute.path}</code>
        </div>

        {/* Request Body */}
        {selectedRoute.requiresBody && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Request Body (JSON)
            </label>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-xs"
              placeholder='{"key": "value"}'
            />
          </div>
        )}
      </div>

      {/* Ergebnisse */}
      {results.length > 0 && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-anthrazit">
              Ergebnisse ({results.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setResults([]); setExpandedResult(null); }}
              className="text-xs text-muted-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Leeren
            </Button>
          </div>

          <div className="space-y-2">
            {results.map((result) => (
              <div key={result.id} className="rounded-lg border overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                >
                  {getStatusIcon(result.status)}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getStatusColor(result.status)}`}>
                    {result.status || "ERR"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {result.method}
                  </span>
                  <span className="flex-1 truncate text-xs font-mono text-muted-foreground">
                    {result.path}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {result.responseTime}ms
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {result.timestamp.toLocaleTimeString("de-DE")}
                  </span>
                </button>

                {/* Expandierter Body */}
                {expandedResult === result.id && (
                  <div className="border-t bg-muted/10 px-3 py-2">
                    {result.error ? (
                      <p className="text-xs text-red-600">{result.error}</p>
                    ) : (
                      <pre className="max-h-80 overflow-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                        {result.body}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
