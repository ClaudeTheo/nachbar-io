"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { WASTE_TYPES, DISCLAIMERS } from "@/lib/municipal";

export default function WasteCalendarPage() {
  const [activeMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-full p-1 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Müllkalender</h1>
        </div>
        <Link
          href="/waste-calendar#reminders"
          className="rounded-full p-2 hover:bg-gray-100"
          aria-label="Erinnerungen"
        >
          <Bell className="h-5 w-5 text-anthrazit" />
        </Link>
      </div>

      {/* Naechste Abholung — Platzhalter */}
      <div className="rounded-xl bg-gradient-to-r from-quartier-green/5 to-transparent p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nächste Abholung</p>
        <p className="mt-1 text-lg font-bold text-anthrazit">Noch keine Daten geladen</p>
        <p className="text-sm text-muted-foreground">Termine werden bald ergänzt.</p>
      </div>

      {/* Muellarten-Legende */}
      <div className="flex flex-wrap gap-2">
        {WASTE_TYPES.map((type) => (
          <span
            key={type.id}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${type.color}15`, color: type.color }}
          >
            <span aria-hidden="true">{type.icon}</span>
            {type.label}
          </span>
        ))}
      </div>

      {/* Kalender-Platzhalter */}
      <div className="rounded-xl bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-anthrazit">
            {new Date(activeMonth + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </h2>
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 text-4xl" aria-hidden="true">📅</div>
          <p className="text-sm text-muted-foreground">
            Der Kalender wird nach der Datenbank-Einrichtung befüllt.
          </p>
        </div>
      </div>

      {/* Erinnerungen — Platzhalter */}
      <div id="reminders" className="rounded-xl bg-white p-4 shadow-soft">
        <h2 className="mb-3 font-semibold text-anthrazit">Erinnerungen</h2>
        <div className="space-y-2">
          {WASTE_TYPES.filter(t => t.id !== "sperrmuell").map((type) => (
            <label
              key={type.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm text-anthrazit">
                <span aria-hidden="true">{type.icon}</span>
                {type.label}
              </span>
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="h-5 w-5 rounded border-gray-300 text-quartier-green"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Erinnerung am Vorabend per Push-Benachrichtigung.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-muted-foreground">
        {DISCLAIMERS.wasteCalendar}
      </p>
    </div>
  );
}
