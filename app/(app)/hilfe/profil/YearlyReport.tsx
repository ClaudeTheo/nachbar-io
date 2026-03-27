"use client";

// Nachbar Hilfe — Jahresabrechnung Komponente
// Ermoeglicht Download als PDF oder CSV fuer Helfer (Einnahmen) und Bewohner (Ausgaben)

import { useState } from "react";
import { FileText, Table } from "lucide-react";
import { InfoHint } from "@/app/(app)/hilfe/anleitung/bundesland/InfoHint";

interface Props {
  availableYears: number[];
  isHelper: boolean;
  isResident: boolean;
}

export function YearlyReport({ availableYears, isHelper, isResident }: Props) {
  const [year, setYear] = useState(
    availableYears[0] ?? new Date().getFullYear(),
  );
  const [loading, setLoading] = useState<string | null>(null);

  if (availableYears.length === 0 || (!isHelper && !isResident)) return null;

  async function download(type: "helper" | "resident", format: "pdf" | "csv") {
    const key = `${type}-${format}`;
    setLoading(key);
    try {
      const res = await fetch(
        `/api/hilfe/yearly-report?year=${year}&type=${type}&format=${format}`,
      );
      if (!res.ok) throw new Error("Download fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = type === "helper" ? "Einnahmen" : "Ausgaben";
      a.download = `Jahresabrechnung_${label}_${year}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fehler still ignorieren — Button wird freigegeben
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Jahresabrechnung</h2>

      <div>
        <label className="text-sm text-gray-600 block mb-1">Steuerjahr</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[48px]"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {isHelper && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800 flex items-center">
            Meine Einnahmen {year}
            <InfoHint text="Diese Uebersicht zeigt alle Ihre Einnahmen als Nachbarschaftshelfer. Geben Sie das PDF Ihrem Steuerberater oder laden Sie die CSV-Datei in Ihr Steuerprogramm." />
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => download("helper", "pdf")}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#4CAF87] text-[#4CAF87] font-medium py-3 min-h-[48px] hover:bg-green-50 disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              {loading === "helper-pdf"
                ? "Wird erstellt..."
                : "PDF herunterladen"}
            </button>
            <button
              onClick={() => download("helper", "csv")}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 text-gray-600 font-medium py-3 min-h-[48px] hover:bg-gray-50 disabled:opacity-50"
            >
              <Table className="w-5 h-5" />
              {loading === "helper-csv"
                ? "Wird erstellt..."
                : "CSV herunterladen"}
            </button>
          </div>
        </div>
      )}

      {isResident && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-800 flex items-center">
            Meine Ausgaben {year}
            <InfoHint text="Diese Uebersicht zeigt Ihre Ausgaben fuer Nachbarschaftshilfe. Sie koennen diese Kosten als haushaltsnahe Dienstleistungen in der Steuererklaerung angeben (§ 35a EStG)." />
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => download("resident", "pdf")}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#4CAF87] text-[#4CAF87] font-medium py-3 min-h-[48px] hover:bg-green-50 disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              {loading === "resident-pdf"
                ? "Wird erstellt..."
                : "PDF herunterladen"}
            </button>
            <button
              onClick={() => download("resident", "csv")}
              disabled={loading !== null}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 text-gray-600 font-medium py-3 min-h-[48px] hover:bg-gray-50 disabled:opacity-50"
            >
              <Table className="w-5 h-5" />
              {loading === "resident-csv"
                ? "Wird erstellt..."
                : "CSV herunterladen"}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Allgemeine Informationen, keine Rechtsberatung.
      </p>
    </div>
  );
}
