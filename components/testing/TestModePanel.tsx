"use client";

// components/testing/TestModePanel.tsx
// Nachbar.io — Schwebendes Test-Panel fuer den Testmodus
// Minimiert: Badge mit Fortschrittsring
// Maximiert: Pfad-Uebersicht, Checkliste, Ergebnis-Eingabe

import { useState, useMemo, useCallback } from "react";
import {
  X, ChevronDown, ChevronRight, CheckCircle2, XCircle, MinusCircle,
  AlertTriangle, SkipForward, Circle, MessageSquare, Star,
  ClipboardList, BarChart3, Send, Camera, Loader2, Trash2,
} from "lucide-react";
import { useTestMode } from "./TestModeProvider";
import { TEST_PATHS } from "@/lib/testing/test-config";
import type { TestStatus, IssueSeverity, IssueType } from "@/lib/testing/types";
import { TesterOnboardingFlow } from "./TesterOnboardingFlow";

// ============================================================
// Status-Konfiguration
// ============================================================

const STATUS_CONFIG: Record<TestStatus, { icon: typeof CheckCircle2; label: string; color: string; bgColor: string }> = {
  open: { icon: Circle, label: "Offen", color: "text-gray-400", bgColor: "bg-gray-100" },
  passed: { icon: CheckCircle2, label: "Bestanden", color: "text-emerald-600", bgColor: "bg-emerald-50" },
  partial: { icon: MinusCircle, label: "Teilweise", color: "text-amber-600", bgColor: "bg-amber-50" },
  failed: { icon: XCircle, label: "Fehlgeschlagen", color: "text-red-600", bgColor: "bg-red-50" },
  skipped: { icon: SkipForward, label: "Uebersprungen", color: "text-gray-500", bgColor: "bg-gray-50" },
};

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string; color: string }[] = [
  { value: "low", label: "Niedrig", color: "bg-blue-100 text-blue-700" },
  { value: "medium", label: "Mittel", color: "bg-amber-100 text-amber-700" },
  { value: "high", label: "Hoch", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Kritisch", color: "bg-red-100 text-red-700" },
];

const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: "ui", label: "UI" },
  { value: "ux", label: "UX" },
  { value: "functional", label: "Funktion" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Sicherheit" },
  { value: "text", label: "Text" },
  { value: "accessibility", label: "Barrierefreiheit" },
];

// ============================================================
// Hauptkomponente
// ============================================================

export function TestModePanel() {
  const {
    session, results, panelOpen, setPanelOpen,
    activePathId, setActivePathId,
    updateResult, completeSession, abandonSession,
    startSession, onboardingComplete, completeOnboarding,
    isLoading,
  } = useTestMode();

  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);

  // Fortschritt berechnen
  const progress = useMemo(() => {
    const total = results.size;
    if (total === 0) return { total: 0, done: 0, passed: 0, partial: 0, failed: 0, skipped: 0, open: 0, percent: 0 };

    let passed = 0, partial = 0, failed = 0, skipped = 0, open = 0;
    for (const r of results.values()) {
      switch (r.status) {
        case "passed": passed++; break;
        case "partial": partial++; break;
        case "failed": failed++; break;
        case "skipped": skipped++; break;
        default: open++; break;
      }
    }
    const done = passed + partial + failed + skipped;
    return { total, done, passed, partial, failed, skipped, open, percent: Math.round((done / total) * 100) };
  }, [results]);

  // Onboarding anzeigen
  if (!onboardingComplete) {
    return <TesterOnboardingFlow />;
  }

  // Kein Laden, kein Panel
  if (isLoading) return null;

  // Keine Session: Start-Button zeigen
  if (!session || session.status !== "active") {
    return <StartSessionButton onStart={startSession} />;
  }

  // ─────────────────────────────────────────────────
  // Minimiertes Panel: Fortschritts-Badge
  // ─────────────────────────────────────────────────
  if (!panelOpen) {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-anthrazit shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        aria-label={`Test-Panel oeffnen (${progress.percent}% abgeschlossen)`}
      >
        {/* Fortschritts-Ring */}
        <svg className="absolute inset-0 h-14 w-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
          <circle
            cx="28" cy="28" r="24" fill="none" stroke="#4CAF87" strokeWidth="3"
            strokeDasharray={`${(progress.percent / 100) * 150.8} 150.8`}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative text-sm font-bold text-white">{progress.percent}%</span>
        {progress.failed > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {progress.failed}
          </span>
        )}
      </button>
    );
  }

  // ─────────────────────────────────────────────────
  // Maximiertes Panel
  // ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t bg-white shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:max-h-[80vh] md:w-[420px] md:rounded-2xl md:border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-quartier-green" />
          <span className="font-semibold text-anthrazit">Test-Modus</span>
          <span className="rounded-full bg-quartier-green/10 px-2 py-0.5 text-xs font-medium text-quartier-green">
            {progress.percent}%
          </span>
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          className="rounded-lg p-1.5 hover:bg-gray-100"
          aria-label="Panel minimieren"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fortschritts-Uebersicht */}
      <div className="border-b px-4 py-3">
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-quartier-green transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="text-emerald-600">✓ {progress.passed}</span>
          <span className="text-amber-600">◐ {progress.partial}</span>
          <span className="text-red-600">✗ {progress.failed}</span>
          <span className="text-gray-500">⏭ {progress.skipped}</span>
          <span className="text-gray-400">○ {progress.open}</span>
        </div>
      </div>

      {/* Scrollbarer Inhalt */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
        {showFeedback ? (
          <FeedbackForm
            onSubmit={completeSession}
            onCancel={() => setShowFeedback(false)}
          />
        ) : (
          <>
            {/* Testpfade */}
            {TEST_PATHS.map(path => (
              <PathSection
                key={path.id}
                path={path}
                results={results}
                isExpanded={activePathId === path.id}
                onToggle={() => setActivePathId(activePathId === path.id ? null : path.id)}
                editingPointId={editingPointId}
                onEditPoint={setEditingPointId}
                onUpdateResult={updateResult}
                sessionId={session.id}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer-Aktionen */}
      {!showFeedback && (
        <div className="border-t px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-quartier-green px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-quartier-green/90"
            >
              <Send className="h-4 w-4" />
              Session abschliessen
            </button>
            <button
              onClick={() => setShowConfirmAbandon(true)}
              className="rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>

          {showConfirmAbandon && (
            <div className="mt-2 rounded-lg bg-red-50 p-3">
              <p className="mb-2 text-xs text-red-700">Session wirklich abbrechen? Der Fortschritt bleibt gespeichert, aber die Session wird als &quot;abgebrochen&quot; markiert.</p>
              <div className="flex gap-2">
                <button
                  onClick={async () => { await abandonSession(); setShowConfirmAbandon(false); }}
                  className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                >
                  Ja, abbrechen
                </button>
                <button
                  onClick={() => setShowConfirmAbandon(false)}
                  className="rounded border px-3 py-1 text-xs hover:bg-white"
                >
                  Zurueck
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PathSection: Ein Testpfad mit Testpunkten
// ============================================================

function PathSection({
  path,
  results,
  isExpanded,
  onToggle,
  editingPointId,
  onEditPoint,
  onUpdateResult,
  sessionId,
}: {
  path: (typeof TEST_PATHS)[0];
  results: Map<string, import("@/lib/testing/types").TestResult>;
  isExpanded: boolean;
  onToggle: () => void;
  editingPointId: string | null;
  onEditPoint: (id: string | null) => void;
  onUpdateResult: (id: string, status: TestStatus, details?: Record<string, unknown>) => Promise<void>;
  sessionId: string;
}) {
  const activePoints = path.points.filter(p => p.active);
  const pathProgress = useMemo(() => {
    let done = 0;
    for (const p of activePoints) {
      const r = results.get(p.id);
      if (r && r.status !== "open") done++;
    }
    return { total: activePoints.length, done, percent: activePoints.length > 0 ? Math.round((done / activePoints.length) * 100) : 0 };
  }, [activePoints, results]);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-anthrazit truncate">{path.name}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">{pathProgress.done}/{pathProgress.total}</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-quartier-green transition-all"
              style={{ width: `${pathProgress.percent}%` }}
            />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {activePoints.map(point => {
            const result = results.get(point.id);
            const status = result?.status ?? "open";
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const isEditing = editingPointId === point.id;

            return (
              <div key={point.id} className="mb-1 last:mb-0">
                <button
                  onClick={() => onEditPoint(isEditing ? null : point.id)}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                    isEditing ? "bg-gray-100 ring-1 ring-quartier-green/30" : "hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{point.id}</span>
                      <span className="text-xs text-anthrazit truncate">{point.title}</span>
                      {point.mode === "pair" && (
                        <span className="shrink-0 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-medium text-blue-700">2P</span>
                      )}
                    </div>
                    {isEditing && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{point.description}</p>
                    )}
                  </div>
                </button>

                {/* Bearbeitungs-Bereich */}
                {isEditing && (
                  <ResultEditor
                    testPointId={point.id}
                    sessionId={sessionId}
                    currentResult={result ?? null}
                    onSave={async (s, details) => {
                      await onUpdateResult(point.id, s, details);
                      onEditPoint(null);
                    }}
                    onCancel={() => onEditPoint(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ResultEditor: Status + Details fuer einen Testpunkt
// ============================================================

function ResultEditor({
  testPointId,
  sessionId,
  currentResult,
  onSave,
  onCancel,
}: {
  testPointId: string;
  sessionId: string;
  currentResult: import("@/lib/testing/types").TestResult | null;
  onSave: (status: TestStatus, details?: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<TestStatus>(currentResult?.status ?? "open");
  const [comment, setComment] = useState(currentResult?.comment ?? "");
  const [severity, setSeverity] = useState<IssueSeverity | "">(currentResult?.severity ?? "");
  const [issueType, setIssueType] = useState<IssueType | "">(currentResult?.issue_type ?? "");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(currentResult?.screenshot_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showDetails = status === "failed" || status === "partial";

  // Screenshot hochladen
  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const { uploadTestScreenshot } = await import("@/lib/storage");
      const supabase = createClient();
      const url = await uploadTestScreenshot(supabase, sessionId, testPointId, file);
      setScreenshotUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Screenshot-Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      // Input zuruecksetzen damit erneutes Auswaehlen funktioniert
      e.target.value = "";
    }
  };

  // Screenshot entfernen
  const removeScreenshot = async () => {
    if (!screenshotUrl) return;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const { deleteImage } = await import("@/lib/storage");
      const supabase = createClient();
      await deleteImage(supabase, screenshotUrl);
    } catch {
      // Loeschen ist nicht kritisch
    }
    setScreenshotUrl(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(status, {
        comment: comment || undefined,
        severity: severity || undefined,
        issue_type: issueType || undefined,
        screenshot_url: screenshotUrl || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-3 mb-2 rounded-lg border bg-white p-3">
      {/* Status-Buttons */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.entries(STATUS_CONFIG) as [TestStatus, typeof STATUS_CONFIG.open][])
          .filter(([key]) => key !== "open")
          .map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  status === key
                    ? `${cfg.bgColor} ${cfg.color} ring-1 ring-current/20`
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </button>
            );
          })}
      </div>

      {/* Erweiterte Details bei failed/partial */}
      {showDetails && (
        <>
          {/* Schweregrad */}
          <div className="mb-2">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Schweregrad</label>
            <div className="flex flex-wrap gap-1">
              {SEVERITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSeverity(severity === opt.value ? "" : opt.value)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    severity === opt.value ? opt.color : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Issue-Type */}
          <div className="mb-2">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Art des Problems</label>
            <div className="flex flex-wrap gap-1">
              {ISSUE_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setIssueType(issueType === opt.value ? "" : opt.value)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    issueType === opt.value ? "bg-anthrazit text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kommentar */}
          <div className="mb-2">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="mr-1 inline h-3 w-3" />Kommentar
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Was genau ist das Problem?"
              className="w-full resize-none rounded-lg border bg-gray-50 px-3 py-2 text-xs placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green/30"
              rows={2}
              maxLength={5000}
            />
          </div>

          {/* Screenshot */}
          <div className="mb-2">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Camera className="mr-1 inline h-3 w-3" />Screenshot
            </label>

            {screenshotUrl ? (
              // Vorschau mit Entfernen-Button
              <div className="relative inline-block">
                <img
                  src={screenshotUrl}
                  alt="Screenshot"
                  className="h-24 w-auto rounded-lg border object-cover"
                />
                <button
                  onClick={removeScreenshot}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                  aria-label="Screenshot entfernen"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              // Upload-Button
              <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs transition-colors ${
                uploading ? "bg-gray-50 text-muted-foreground" : "text-muted-foreground hover:border-quartier-green hover:bg-quartier-green/5 hover:text-quartier-green"
              }`}>
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" />
                    Foto aufnehmen oder auswaehlen
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleScreenshot}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </>
      )}

      {/* Speichern / Abbrechen */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || uploading || status === "open"}
          className="flex-1 rounded-lg bg-anthrazit px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-anthrazit/90 disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FeedbackForm: Abschluss-Feedback
// ============================================================

function FeedbackForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (feedback: import("@/lib/testing/types").SessionFeedback) => Promise<void>;
  onCancel: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [usability, setUsability] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        final_feedback: feedback,
        usability_rating: usability || 3,
        confidence_rating: confidence || 3,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="mb-4 text-center text-base font-semibold text-anthrazit">Test abschliessen</h3>

      {/* Usability Rating */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-anthrazit">
          Wie benutzerfreundlich fanden Sie die App?
        </label>
        <StarRating value={usability} onChange={setUsability} />
      </div>

      {/* Confidence Rating */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-anthrazit">
          Wie sicher fuehlen Sie sich bei der Nutzung?
        </label>
        <StarRating value={confidence} onChange={setConfidence} />
      </div>

      {/* Freitext */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-anthrazit">
          Ihr Gesamteindruck (optional)
        </label>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Was hat Ihnen gefallen? Was sollte verbessert werden?"
          className="w-full resize-none rounded-lg border px-3 py-2 text-sm placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green/30"
          rows={4}
          maxLength={5000}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-quartier-green/90 disabled:opacity-50"
        >
          {submitting ? "Wird gesendet..." : "Test abschliessen"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border px-4 py-2.5 text-sm text-muted-foreground hover:bg-gray-50"
        >
          Zurueck
        </button>
      </div>
    </div>
  );
}

// ============================================================
// StarRating Komponente
// ============================================================

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${n} Stern${n > 1 ? "e" : ""}`}
        >
          <Star
            className={`h-7 w-7 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

// ============================================================
// StartSessionButton: Schwebendes Badge wenn keine Session aktiv
// ============================================================

function StartSessionButton({ onStart }: { onStart: (metadata?: Record<string, string>) => Promise<void> }) {
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      // Geraete-Info sammeln
      const deviceType = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
      const browserInfo = navigator.userAgent.slice(0, 200);

      await onStart({
        device_type: deviceType,
        browser_info: browserInfo,
        started_from_route: window.location.pathname,
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={starting}
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-anthrazit px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 md:bottom-6"
    >
      <BarChart3 className="h-4 w-4" />
      {starting ? "Wird gestartet..." : "Test starten"}
    </button>
  );
}
