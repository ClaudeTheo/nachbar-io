"use client";

// CareVisitCard: Zeigt letzten Besuch und naechsten geplanten Besuch
// Gruener Dot bei Besuchen innerhalb der letzten 24 Stunden

import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";

interface CareVisitCardProps {
  lastVisitDate: string | null;
  lastVisitType: string | null;
  nextPlannedVisit: string | null;
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  grundpflege: "Grundpflege",
  behandlungspflege: "Behandlungspflege",
  hauswirtschaft: "Hauswirtschaft",
  betreuung: "Betreuung",
};

export function CareVisitCard({
  lastVisitDate,
  lastVisitType,
  nextPlannedVisit,
}: CareVisitCardProps) {
  const [mountedAt] = useState(() => Date.now());
  const isRecent =
    lastVisitDate &&
    mountedAt - new Date(lastVisitDate).getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[#2D3142]">
        Pflegebesuche
      </h3>

      {/* Letzter Besuch */}
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${
            isRecent ? "bg-green-500" : lastVisitDate ? "bg-gray-300" : "bg-gray-200"
          }`}
        />
        <div>
          <p className="text-xs font-medium text-gray-500">Letzter Besuch</p>
          {lastVisitDate ? (
            <>
              <p className="text-sm font-medium text-[#2D3142]">
                {formatDistanceToNow(new Date(lastVisitDate), {
                  addSuffix: true,
                  locale: de,
                })}
              </p>
              {lastVisitType && (
                <p className="text-xs text-gray-400">
                  {VISIT_TYPE_LABELS[lastVisitType] ?? lastVisitType}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Kein Besuch dokumentiert</p>
          )}
        </div>
      </div>

      {/* Naechster geplanter Besuch */}
      <div className="flex items-start gap-3 border-t border-gray-100 pt-3">
        <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
        <div>
          <p className="text-xs font-medium text-gray-500">
            Naechster geplanter Besuch
          </p>
          {nextPlannedVisit ? (
            <p className="flex items-center gap-1 text-sm font-medium text-[#2D3142]">
              <Clock className="h-3 w-3 text-gray-400" />
              {format(new Date(nextPlannedVisit), "dd.MM.yyyy", { locale: de })}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Nicht geplant</p>
          )}
        </div>
      </div>
    </div>
  );
}
