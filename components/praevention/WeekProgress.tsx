"use client";

import { CheckCircle, Circle } from "lucide-react";

interface WeekData {
  week: number;
  dailyCompleted: number;
  weeklyCompleted: boolean;
}

interface WeekProgressProps {
  weeks: WeekData[];
  currentWeek: number;
}

export function WeekProgress({ weeks, currentWeek }: WeekProgressProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">
        Kurs-Fortschritt
      </h3>

      {/* 8-Wochen-Leiste */}
      <div className="grid grid-cols-8 gap-2">
        {weeks.map((week) => {
          const isComplete = week.weeklyCompleted && week.dailyCompleted >= 5;
          const isActive = week.week === currentWeek;
          const isPast = week.week < currentWeek;

          return (
            <div
              key={week.week}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-2 ${
                isActive
                  ? "bg-emerald-50 ring-2 ring-emerald-500"
                  : isComplete
                    ? "bg-emerald-50"
                    : isPast
                      ? "bg-gray-50"
                      : "bg-gray-50 opacity-50"
              }`}
            >
              {/* Wochen-Nummer */}
              <span
                className={`text-xs font-semibold ${
                  isActive ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                W{week.week}
              </span>

              {/* Status-Icon */}
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle
                  className={`h-5 w-5 ${
                    isActive ? "text-emerald-400" : "text-gray-300"
                  }`}
                />
              )}

              {/* Sitzungs-Zaehler */}
              <span className="text-[10px] text-gray-400">
                {week.dailyCompleted}/7
              </span>
            </div>
          );
        })}
      </div>

      {/* Zusammenfassung */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>Woche {currentWeek} von 8</span>
        <span>
          {
            weeks.filter((w) => w.weeklyCompleted && w.dailyCompleted >= 5)
              .length
          }{" "}
          Wochen abgeschlossen
        </span>
      </div>
    </div>
  );
}
