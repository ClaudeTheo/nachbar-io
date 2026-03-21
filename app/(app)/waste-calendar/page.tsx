"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { WASTE_TYPES, DISCLAIMERS, ANNOUNCEMENT_CALENDAR_COLORS, ANNOUNCEMENT_CATEGORIES } from "@/lib/municipal";
import type { WasteSchedule, WasteReminder, WasteType, WasteCollectionDate, CalendarAnnouncementEvent } from "@/lib/municipal";

// --- Hilfsfunktionen ---

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Deutsches Datumsformat: "Montag, 24. März" */
function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Kurzformat: "Mo, 24.03." */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("de-DE", { weekday: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${day}.${month}.`;
}

/** Heute als YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Alle Tage eines Monats im Kalender-Grid (inkl. Offset-Tage davor/danach) */
function getCalendarDays(year: number, month: number): { date: string; inMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  // Wochentag: 0=So -> wir brauchen Mo=0
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: string; inMonth: boolean }[] = [];

  // Tage des vorherigen Monats
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    days.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      inMonth: false,
    });
  }

  // Tage des aktuellen Monats
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      inMonth: true,
    });
  }

  // Restliche Tage auffuellen (bis Reihen komplett)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        inMonth: false,
      });
    }
  }

  return days;
}

/** Waste-Type Lookup Map */
const wasteTypeMap = new Map(WASTE_TYPES.map((t) => [t.id, t]));

/** Announcement-Kategorie Lookup Map */
const announcementCategoryMap = new Map(ANNOUNCEMENT_CATEGORIES.map((c) => [c.id, c]));

// --- Hauptkomponente ---

export default function WasteCalendarPage() {
  const { currentQuarter, loading: quarterLoading } = useQuarter();
  const supabase = createClient();

  // Kalendermonat-Navigation
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Daten — primaer aus waste_collection_dates (source-driven), Fallback waste_schedules
  const [schedules, setSchedules] = useState<(WasteSchedule | WasteCollectionDate)[]>([]);
  const [reminders, setReminders] = useState<WasteReminder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingType, setSavingType] = useState<WasteType | null>(null);

  // Amtsblatt-Termine
  const [announcements, setAnnouncements] = useState<CalendarAnnouncementEvent[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(true);

  // Tooltip fuer Kalendertag
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // --- Daten laden ---
  useEffect(() => {
    if (!currentQuarter?.id) return;
    const quarterId = currentQuarter.id;
    let cancelled = false;

    async function loadData() {
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Abfuhrgebiete fuer dieses Quartier ermitteln (source-driven)
      const { data: areaLinks } = await supabase
        .from("quarter_collection_areas")
        .select("area_id")
        .eq("quarter_id", quarterId);

      const areaIds = (areaLinks ?? []).map((a: { area_id: string }) => a.area_id);

      // 2. Termine + Erinnerungen + Amtsblatt parallel laden
      const [newSchedulesRes, legacyRes, remindersRes, announcementsRes] = await Promise.all([
        // Neue Tabelle (source-driven)
        areaIds.length > 0
          ? supabase
              .from("waste_collection_dates")
              .select("*")
              .in("area_id", areaIds)
              .gte("collection_date", todayStr())
              .eq("is_cancelled", false)
              .order("collection_date", { ascending: true })
          : Promise.resolve({ data: [] }),
        // Fallback: alte Tabelle (quartierbezogen)
        supabase
          .from("waste_schedules")
          .select("*")
          .eq("quarter_id", quarterId)
          .gte("collection_date", todayStr())
          .order("collection_date", { ascending: true }),
        user
          ? supabase
              .from("waste_reminders")
              .select("*")
              .eq("user_id", user.id)
          : Promise.resolve({ data: null }),
        // Amtsblatt-Termine (Bekanntmachungen)
        supabase
          .from("municipal_announcements")
          .select("id, title, category, published_at, event_date, expires_at, source_url")
          .eq("quarter_id", quarterId)
          .order("published_at"),
      ]);

      if (cancelled) return;

      // Source-driven Termine bevorzugen, sonst Fallback
      const newDates = newSchedulesRes.data ?? [];
      const legacyDates = legacyRes.data ?? [];
      setSchedules(newDates.length > 0 ? newDates : legacyDates);
      if (remindersRes.data) setReminders(remindersRes.data);
      setAnnouncements((announcementsRes.data ?? []) as CalendarAnnouncementEvent[]);
      setLoadingData(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, [currentQuarter?.id, supabase]);

  // --- Naechste 3 Abholungen ---
  const nextPickups = useMemo(() => {
    const today = todayStr();
    return schedules
      .filter((s) => s.collection_date >= today)
      .slice(0, 3);
  }, [schedules]);

  // --- Termine nach Datum gruppiert (fuer Kalender) ---
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, (WasteSchedule | WasteCollectionDate)[]>();
    for (const s of schedules) {
      const list = map.get(s.collection_date) ?? [];
      list.push(s);
      map.set(s.collection_date, list);
    }
    return map;
  }, [schedules]);

  // --- Amtsblatt-Termine nach Datum gruppiert (fuer Kalender) ---
  const announcementsByDate = useMemo(() => {
    const map = new Map<string, CalendarAnnouncementEvent[]>();
    for (const a of announcements) {
      // event_date bevorzugen (Veranstaltungsdatum), Fallback auf published_at
      const dateKey = (a.event_date ?? a.published_at).slice(0, 10);
      const list = map.get(dateKey) ?? [];
      list.push(a);
      map.set(dateKey, list);
    }
    return map;
  }, [announcements]);

  // --- Kalender-Tage ---
  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  // --- Monat navigieren ---
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  // --- Erinnerung toggeln ---
  const toggleReminder = async (wasteType: WasteType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Bitte melden Sie sich an.");
      return;
    }

    setSavingType(wasteType);
    const existing = reminders.find((r) => r.waste_type === wasteType);
    const newEnabled = existing ? !existing.enabled : true;

    const { error } = await supabase
      .from("waste_reminders")
      .upsert(
        {
          user_id: user.id,
          waste_type: wasteType,
          enabled: newEnabled,
          remind_at: "evening_before",
        },
        { onConflict: "user_id,waste_type" }
      );

    if (error) {
      toast.error("Erinnerung konnte nicht gespeichert werden.");
    } else {
      // Lokalen State aktualisieren
      setReminders((prev) => {
        const idx = prev.findIndex((r) => r.waste_type === wasteType);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], enabled: newEnabled };
          return updated;
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            waste_type: wasteType,
            enabled: newEnabled,
            remind_at: "evening_before",
            created_at: new Date().toISOString(),
          },
        ];
      });
      toast.success(
        newEnabled ? "Erinnerung aktiviert" : "Erinnerung deaktiviert"
      );
    }
    setSavingType(null);
  };

  // --- Klick ausserhalb Tooltip schliesst ihn ---
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setSelectedDay(null);
      }
    }
    if (selectedDay) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [selectedDay]);

  // --- Lade-Zustand ---
  const isLoading = quarterLoading || loadingData;
  const today = todayStr();

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-full p-2 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-anthrazit" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-anthrazit">Quartier-Kalender</h1>
            <p className="text-xs text-muted-foreground">Mülltermine & Veranstaltungen in Ihrem Quartier</p>
          </div>
        </div>
        <Link
          href="/waste-calendar#reminders"
          className="rounded-full p-2 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Zu den Erinnerungen"
        >
          <Bell className="h-5 w-5 text-anthrazit" />
        </Link>
      </div>

      {/* Naechste Abholungen */}
      <div className="rounded-xl bg-gradient-to-r from-quartier-green/5 to-transparent p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nächste Abholung
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 mt-2">
            <Loader2 className="h-4 w-4 animate-spin text-quartier-green" />
            <span className="text-sm text-muted-foreground">Termine werden geladen…</span>
          </div>
        ) : nextPickups.length === 0 ? (
          <div className="mt-1">
            <p className="text-lg font-bold text-anthrazit">Keine Termine</p>
            <p className="text-sm text-muted-foreground">
              Aktuell sind keine kommenden Abholtermine eingetragen.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {nextPickups.map((pickup) => {
              const wt = wasteTypeMap.get(pickup.waste_type);
              return (
                <div
                  key={pickup.id}
                  className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2"
                >
                  <span className="text-xl" aria-hidden="true">
                    {wt?.icon ?? "📦"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-anthrazit">
                      {wt?.label ?? pickup.waste_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateLong(pickup.collection_date)}
                    </p>
                    {pickup.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {pickup.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legende + Amtsblatt-Toggle */}
      <div className="space-y-2">
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
        {/* Toggle fuer Amtsblatt-Termine */}
        <button
          onClick={() => setShowAnnouncements((v) => !v)}
          className="flex items-center justify-between w-full rounded-lg bg-gray-50 px-3 py-2.5 min-h-[44px] hover:bg-gray-100 transition-colors"
          aria-label={`Amtsblatt-Termine ${showAnnouncements ? "ausblenden" : "einblenden"}`}
          data-testid="announcement-toggle"
        >
          <span className="flex items-center gap-2 text-sm text-anthrazit">
            <span aria-hidden="true">📰</span>
            Amtsblatt-Termine anzeigen
          </span>
          <div
            className={`
              w-11 h-6 rounded-full transition-colors relative
              ${showAnnouncements ? "bg-quartier-green" : "bg-gray-300"}
            `}
            role="switch"
            aria-checked={showAnnouncements}
          >
            <div
              className={`
                absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                ${showAnnouncements ? "translate-x-[22px]" : "translate-x-0.5"}
              `}
            />
          </div>
        </button>
      </div>

      {/* Monatskalender */}
      <div className="rounded-xl bg-white p-4 shadow-soft">
        {/* Monat-Navigation */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-full p-2 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-5 w-5 text-anthrazit" />
          </button>
          <h2 className="font-semibold text-anthrazit capitalize">{monthLabel}</h2>
          <button
            onClick={nextMonth}
            className="rounded-full p-2 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="h-5 w-5 text-anthrazit" />
          </button>
        </div>

        {/* Wochentag-Header */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Kalender-Grid */}
        <div className="grid grid-cols-7 gap-px relative">
          {calendarDays.map(({ date, inMonth }) => {
            const dayCollections = schedulesByDate.get(date) ?? [];
            const dayAnnouncements = showAnnouncements ? (announcementsByDate.get(date) ?? []) : [];
            const isToday = date === today;
            const hasCollections = dayCollections.length > 0;
            const hasAnnouncements = dayAnnouncements.length > 0;
            const hasEvents = hasCollections || hasAnnouncements;
            const dayNum = parseInt(date.split("-")[2], 10);

            return (
              <div key={date} className="relative">
                <button
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDay(selectedDay === date ? null : date);
                    }
                  }}
                  disabled={!hasEvents}
                  className={`
                    w-full aspect-square flex flex-col items-center justify-center gap-0.5 rounded-lg text-sm
                    transition-colors min-h-[44px]
                    ${!inMonth ? "text-gray-300" : "text-anthrazit"}
                    ${isToday ? "bg-quartier-green/10 font-bold ring-1 ring-quartier-green/30" : ""}
                    ${hasEvents && inMonth ? "hover:bg-gray-50 cursor-pointer" : ""}
                    ${selectedDay === date ? "bg-quartier-green/15" : ""}
                  `}
                  aria-label={
                    hasEvents
                      ? `${dayNum}. — ${dayCollections.length} Abholung(en)${hasAnnouncements ? `, ${dayAnnouncements.length} Veranstaltung(en)` : ""}`
                      : `${dayNum}.`
                  }
                >
                  <span>{dayNum}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayCollections.map((c) => {
                        const wt = wasteTypeMap.get(c.waste_type);
                        return (
                          <span
                            key={c.id}
                            className="block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: wt?.color ?? "#999" }}
                            aria-hidden="true"
                          />
                        );
                      })}
                      {dayAnnouncements.map((a) => (
                        <span
                          key={a.id}
                          className="block h-1.5 w-1.5 rounded-sm"
                          style={{ backgroundColor: ANNOUNCEMENT_CALENDAR_COLORS[a.category] ?? "#9CA3AF" }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  )}
                </button>

                {/* Tooltip/Popup fuer ausgewaehlten Tag */}
                {selectedDay === date && hasEvents && (
                  <div
                    ref={tooltipRef}
                    className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-56 rounded-lg bg-white border border-gray-200 shadow-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-anthrazit">
                        {formatDateShort(date)}
                      </p>
                      <button
                        onClick={() => setSelectedDay(null)}
                        className="rounded-full p-0.5 hover:bg-gray-100"
                        aria-label="Schließen"
                      >
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {/* Muell-Abholungen */}
                      {dayCollections.map((c) => {
                        const wt = wasteTypeMap.get(c.waste_type);
                        return (
                          <div key={c.id} className="flex items-center gap-2">
                            <span
                              className="block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: wt?.color ?? "#999" }}
                            />
                            <span className="text-xs text-anthrazit">
                              {wt?.icon} {wt?.label ?? c.waste_type}
                            </span>
                            {c.notes && (
                              <span className="text-[10px] text-muted-foreground ml-auto italic truncate max-w-[80px]">
                                {c.notes}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {/* Amtsblatt-Termine */}
                      {dayAnnouncements.length > 0 && dayCollections.length > 0 && (
                        <hr className="border-gray-100" />
                      )}
                      {dayAnnouncements.map((a) => {
                        const cat = announcementCategoryMap.get(a.category);
                        return (
                          <div key={a.id} className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="block h-2.5 w-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: ANNOUNCEMENT_CALENDAR_COLORS[a.category] ?? "#9CA3AF" }}
                              />
                              <span className="text-xs text-anthrazit truncate flex-1">
                                {cat?.icon} {a.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 pl-[18px]">
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: `${ANNOUNCEMENT_CALENDAR_COLORS[a.category] ?? "#9CA3AF"}15`,
                                  color: ANNOUNCEMENT_CALENDAR_COLORS[a.category] ?? "#9CA3AF",
                                }}
                              >
                                {cat?.label ?? a.category}
                              </span>
                              <Link
                                href="/city-services?tab=announcements"
                                className="text-[10px] text-quartier-green hover:underline ml-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Zum Artikel
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Erinnerungen */}
      <div id="reminders" className="rounded-xl bg-white p-4 shadow-soft scroll-mt-4">
        <h2 className="mb-3 font-semibold text-anthrazit">Erinnerungen</h2>
        <div className="space-y-2">
          {WASTE_TYPES.filter((t) => t.id !== "sperrmuell").map((type) => {
            const reminder = reminders.find((r) => r.waste_type === type.id);
            const isEnabled = reminder?.enabled ?? false;
            const isSaving = savingType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => toggleReminder(type.id)}
                disabled={isSaving || isLoading}
                className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-3 min-h-[52px] hover:bg-gray-100 transition-colors disabled:opacity-60"
                aria-label={`${type.label} Erinnerung ${isEnabled ? "deaktivieren" : "aktivieren"}`}
              >
                <span className="flex items-center gap-2 text-sm text-anthrazit">
                  <span aria-hidden="true">{type.icon}</span>
                  {type.label}
                </span>
                <div className="relative">
                  {isSaving ? (
                    <Loader2 className="h-5 w-5 animate-spin text-quartier-green" />
                  ) : (
                    // Toggle-Switch
                    <div
                      className={`
                        w-11 h-6 rounded-full transition-colors relative
                        ${isEnabled ? "bg-quartier-green" : "bg-gray-300"}
                      `}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <div
                        className={`
                          absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                          ${isEnabled ? "translate-x-[22px]" : "translate-x-0.5"}
                        `}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Erinnerung am Vorabend per Push-Benachrichtigung.
        </p>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-muted-foreground pb-4">
        {DISCLAIMERS.wasteCalendar}
      </p>
    </div>
  );
}
