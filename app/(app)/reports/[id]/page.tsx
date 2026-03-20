"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import Image from "next/image";
import { ArrowLeft, MapPin, ExternalLink as ExternalLinkIcon, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

import type { MunicipalReport, MunicipalReportComment, ReportCategory } from "@/lib/municipal";
import { REPORT_CATEGORIES, REPORT_STATUS_CONFIG, DISCLAIMERS } from "@/lib/municipal";

// --- Hilfsfunktionen ---

// Deutsches Datumsformat (z.B. "19. März 2026, 14:30 Uhr")
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Relativer Zeitstempel auf Deutsch
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  return new Date(dateStr).toLocaleDateString("de-DE");
}

// Kategorie-Icon anhand der ID
function getCategoryIcon(category: ReportCategory): string {
  return REPORT_CATEGORIES.find((c) => c.id === category)?.icon ?? "❓";
}

// Kategorie-Label anhand der ID
function getCategoryLabel(category: ReportCategory): string {
  return REPORT_CATEGORIES.find((c) => c.id === category)?.label ?? "Sonstiges";
}

// Status-Konfiguration anhand der ID
function getStatusConfig(status: string) {
  return REPORT_STATUS_CONFIG.find((s) => s.id === status) ?? REPORT_STATUS_CONFIG[0];
}

// Koordinaten aus PostGIS-Geography extrahieren
function getCoordinates(location: MunicipalReport["location"]): { lat: number; lng: number } | null {
  if (!location || !location.coordinates) return null;
  // PostGIS speichert [lng, lat]
  const [lng, lat] = location.coordinates;
  return { lat, lng };
}

// --- Skeleton-Komponente fuer Ladezustand ---

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="h-[200px] w-full rounded-xl bg-gray-200" />
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-soft">
        <div className="h-6 w-32 rounded-full bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-16 w-full rounded bg-gray-200" />
        <div className="h-4 w-36 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// --- Hauptkomponente ---

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<MunicipalReport | null>(null);
  const [comments, setComments] = useState<MunicipalReportComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Meldung und Kommentare laden
  const fetchReport = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const supabase = createClient();

      // Meldung abrufen
      const { data: reportData, error: reportError } = await supabase
        .from("municipal_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError || !reportData) {
        console.error("Fehler beim Laden der Meldung:", reportError);
        toast.error("Meldung konnte nicht geladen werden.");
        return;
      }

      setReport(reportData as MunicipalReport);

      // Kommentare mit Benutzerinfo abrufen
      const { data: commentsData, error: commentsError } = await supabase
        .from("municipal_report_comments")
        .select("*, user:users(display_name, avatar_url)")
        .eq("report_id", id)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Fehler beim Laden der Kommentare:", commentsError);
      }

      setComments((commentsData as MunicipalReportComment[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Neuen Kommentar absenden
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;

    setSubmitting(true);
    try {
      const supabase = createClient();

      // Aktuellen Benutzer pruefen
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Bitte melden Sie sich an.");
        return;
      }

      const { error } = await supabase
        .from("municipal_report_comments")
        .insert({
          report_id: id,
          user_id: user.id,
          text: commentText.trim(),
        });

      if (error) {
        console.error("Fehler beim Speichern des Kommentars:", error);
        toast.error("Kommentar konnte nicht gespeichert werden.");
        return;
      }

      toast.success("Kommentar wurde veröffentlicht.");
      setCommentText("");

      // Kommentarliste aktualisieren
      const { data: updatedComments } = await supabase
        .from("municipal_report_comments")
        .select("*, user:users(display_name, avatar_url)")
        .eq("report_id", id)
        .order("created_at", { ascending: true });

      setComments((updatedComments as MunicipalReportComment[]) ?? []);
    } finally {
      setSubmitting(false);
    }
  };

  // Ladezustand
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </button>
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  // Meldung nicht gefunden
  if (!report) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Zurück zur Übersicht"
          >
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Meldung nicht gefunden</h1>
        </div>
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 text-5xl" aria-hidden="true">🔍</div>
          <p className="text-sm text-muted-foreground">
            Diese Meldung existiert nicht oder wurde entfernt.
          </p>
          <Link
            href="/reports"
            className="mt-4 flex h-[48px] items-center rounded-lg bg-quartier-green px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97]"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusConfig(report.status);
  const coords = getCoordinates(report.location);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header: Zurueck-Pfeil, Titel, Status-Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Zurück zur Übersicht"
          >
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </Link>
          <h1 className="text-lg font-bold text-anthrazit">
            {getCategoryLabel(report.category)}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusCfg.color} ${statusCfg.bgColor}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Foto oder Kategorie-Icon */}
      {report.photo_url ? (
        <div className="relative h-[300px] w-full overflow-hidden rounded-xl bg-gray-100">
          <Image
            src={report.photo_url}
            alt={getCategoryLabel(report.category)}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 600px"
            priority
          />
        </div>
      ) : (
        <div className="flex h-[180px] w-full items-center justify-center rounded-xl bg-gray-100">
          <span className="text-6xl" aria-hidden="true">
            {getCategoryIcon(report.category)}
          </span>
        </div>
      )}

      {/* Info-Bereich */}
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-soft">
        {/* Kategorie-Badge */}
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-anthrazit">
          <span aria-hidden="true">{getCategoryIcon(report.category)}</span>
          {getCategoryLabel(report.category)}
        </span>

        {/* Standort */}
        {report.location_text && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{report.location_text}</span>
          </div>
        )}

        {/* Beschreibung */}
        {report.description && (
          <p className="text-sm leading-relaxed text-anthrazit">
            {report.description}
          </p>
        )}

        {/* Erstellt am */}
        <p className="text-xs text-muted-foreground">
          Gemeldet am {formatDate(report.created_at)}
        </p>

        {/* Status-Hinweis (z.B. "Wird am Montag behoben") */}
        {report.status_note && (
          <div className={`rounded-lg p-3 text-sm ${statusCfg.bgColor} ${statusCfg.color}`}>
            <strong>Hinweis:</strong> {report.status_note}
          </div>
        )}

        {/* Erledigt am */}
        {report.resolved_at && (
          <p className="text-xs text-muted-foreground">
            Erledigt am {formatDate(report.resolved_at)}
          </p>
        )}
      </div>

      {/* Mini-Karte / Standort-Link */}
      {coords && (
        <div className="rounded-xl bg-white p-4 shadow-soft">
          <h2 className="mb-2 text-sm font-semibold text-anthrazit">Standort</h2>
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <MapPin className="h-5 w-5 flex-shrink-0 text-quartier-green" />
            <div className="flex-1 text-xs text-muted-foreground">
              {coords.lat.toFixed(5)}° N, {coords.lng.toFixed(5)}° E
            </div>
            <ExternalLink
              href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`}
              title="OpenStreetMap"
              className="flex h-[44px] items-center gap-1 rounded-lg bg-quartier-green/10 px-3 py-2 text-xs font-medium text-quartier-green transition-colors hover:bg-quartier-green/20"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              Auf OpenStreetMap anzeigen
            </ExternalLink>
          </div>
        </div>
      )}

      {/* Rathaus-Hinweis */}
      <div className="rounded-xl border border-alert-amber/30 bg-alert-amber/5 p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          {DISCLAIMERS.reportRathaus}
        </p>
        <ExternalLink
          href="https://www.bad-saeckingen.de/kontakt"
          title="Rathaus Kontakt"
          className="flex h-[48px] items-center justify-center gap-2 rounded-lg border border-alert-amber/30 bg-white px-4 py-2 text-sm font-medium text-anthrazit transition-colors hover:bg-gray-50"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          Beim Rathaus melden
        </ExternalLink>
      </div>

      {/* Kommentare */}
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-soft">
        {/* Ueberschrift mit Anzahl */}
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-anthrazit" />
          <h2 className="text-sm font-semibold text-anthrazit">
            Kommentare ({comments.length})
          </h2>
        </div>

        {/* Kommentarliste */}
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar-Platzhalter */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-xs font-semibold text-quartier-green">
                  {(comment.user?.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
                {/* Kommentarinhalt */}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-anthrazit">
                      {comment.user?.display_name ?? "Unbekannt"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-anthrazit">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Noch keine Kommentare. Schreiben Sie den ersten!
          </p>
        )}

        {/* Neuer Kommentar */}
        <div className="border-t pt-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Kommentar schreiben..."
            maxLength={300}
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-anthrazit placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {commentText.length}/300 Zeichen
            </span>
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submitting}
              className="flex h-[44px] items-center gap-1.5 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white transition-all hover:bg-quartier-green/90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Wird gesendet..." : "Senden"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
