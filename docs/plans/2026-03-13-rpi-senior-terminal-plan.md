# Raspberry Pi 5 Senioren-Terminal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 10" touchscreen kiosk terminal for seniors running on Raspberry Pi 5, with 6 main screens, GPIO hardware bridge, family dashboard, and night mode.

**Architecture:** Chromium Kiosk on Raspberry Pi OS Lite displays a new `/terminal/[token]` route in the existing Next.js app. A Python GPIO-Bridge service on localhost:8765 handles buzzer/LED/brightness. Family dashboard at `/family/[token]` lets relatives monitor check-in status remotely.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui, Supabase Realtime, WebSocket (GPIO-Bridge), Python 3 + gpiozero, Raspberry Pi OS Lite + Cage + Chromium

---

## Task 1: Terminal Layout Shell

**Files:**
- Create: `app/terminal/[token]/layout.tsx`
- Create: `app/terminal/[token]/page.tsx`
- Create: `components/terminal/TerminalSidebar.tsx`
- Create: `components/terminal/TerminalHeader.tsx`

**Step 1: Create the terminal layout with sidebar**

```typescript
// app/terminal/[token]/layout.tsx
"use client";

import { ReactNode } from "react";
import TerminalSidebar from "@/components/terminal/TerminalSidebar";
import TerminalHeader from "@/components/terminal/TerminalHeader";

export default function TerminalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { token: string };
}) {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-warmwhite">
      {/* Hauptbereich ~85% */}
      <div className="flex-1 flex flex-col min-w-0">
        <TerminalHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      {/* Rechte Seitenleiste ~15% */}
      <TerminalSidebar />
    </div>
  );
}
```

**Step 2: Create the sidebar with 5 action buttons**

```typescript
// components/terminal/TerminalSidebar.tsx
"use client";

import { Heart, AlertTriangle, Pill, Video, Newspaper } from "lucide-react";

interface SidebarItem {
  id: string;
  icon: typeof Heart;
  label: string;
  color: string;
  bgColor: string;
}

const ITEMS: SidebarItem[] = [
  { id: "checkin", icon: Heart, label: "Check-in", color: "text-white", bgColor: "bg-quartier-green" },
  { id: "emergency", icon: AlertTriangle, label: "NOTRUF", color: "text-white", bgColor: "bg-emergency-red" },
  { id: "medications", icon: Pill, label: "Medikamente", color: "text-white", bgColor: "bg-info-blue" },
  { id: "video", icon: Video, label: "Sprechstunde", color: "text-white", bgColor: "bg-anthrazit" },
  { id: "news", icon: Newspaper, label: "Neuigkeiten", color: "text-white", bgColor: "bg-anthrazit-light" },
];

export default function TerminalSidebar() {
  return (
    <aside className="w-[140px] flex flex-col gap-2 p-2 bg-lightgray border-l border-gray-200">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={`flex-1 flex flex-col items-center justify-center rounded-xl ${item.bgColor} ${item.color} min-h-[100px] transition-transform active:scale-95 shadow-md`}
          aria-label={item.label}
        >
          <item.icon className="w-10 h-10 mb-1" strokeWidth={2.5} />
          <span className="text-sm font-bold leading-tight text-center">
            {item.label}
          </span>
        </button>
      ))}
    </aside>
  );
}
```

**Step 3: Create the header with weather, date, time**

```typescript
// components/terminal/TerminalHeader.tsx
"use client";

import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain } from "lucide-react";

export default function TerminalHeader() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const dateStr = time.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = time.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <Sun className="w-8 h-8 text-alert-amber" />
        <span className="text-xl font-semibold text-anthrazit">18°C</span>
      </div>
      <div className="text-center">
        <p className="text-lg text-anthrazit-light">{dateStr}</p>
      </div>
      <div className="text-3xl font-bold text-anthrazit tabular-nums">
        {timeStr}
      </div>
    </header>
  );
}
```

**Step 4: Create the home page with 6 dashboard tiles**

```typescript
// app/terminal/[token]/page.tsx
"use client";

import { Heart, AlertTriangle, Pill, Newspaper, Calendar, Video } from "lucide-react";

interface DashboardTile {
  icon: typeof Heart;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
}

const TILES: DashboardTile[] = [
  { icon: Heart, title: "Willkommen!", subtitle: "Naechster Check-in: noch 2 Std.", color: "text-quartier-green", bgColor: "bg-quartier-green/10" },
  { icon: AlertTriangle, title: "Meldungen", subtitle: "Keine offenen Meldungen", color: "text-alert-amber", bgColor: "bg-alert-amber/10" },
  { icon: Pill, title: "Medikamente", subtitle: "Aspirin 100mg in 45 Min", color: "text-info-blue", bgColor: "bg-info-blue/10" },
  { icon: Newspaper, title: "Neuigkeiten", subtitle: "3 neue Beitraege", color: "text-anthrazit", bgColor: "bg-anthrazit/10" },
  { icon: Calendar, title: "Termine", subtitle: "Kaffeeklatsch Mo 15:00", color: "text-quartier-green-dark", bgColor: "bg-quartier-green/10" },
  { icon: Video, title: "Sprechstunde", subtitle: "Dr. Mueller Mi 10:00", color: "text-anthrazit-light", bgColor: "bg-anthrazit/10" },
];

export default function TerminalHomePage() {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {TILES.map((tile, i) => (
        <button
          key={i}
          className={`${tile.bgColor} rounded-2xl p-6 flex flex-col items-start justify-center shadow-sm border border-gray-100 transition-transform active:scale-[0.98] hover:shadow-md`}
        >
          <tile.icon className={`w-12 h-12 ${tile.color} mb-3`} strokeWidth={2} />
          <h2 className="text-2xl font-bold text-anthrazit">{tile.title}</h2>
          <p className="text-lg text-anthrazit-light mt-1">{tile.subtitle}</p>
        </button>
      ))}
    </div>
  );
}
```

**Step 5: Verify it renders**

Run: `cd nachbar-io && npm run dev`
Open: `http://localhost:3000/terminal/test-token`
Expected: Full-screen layout with 6 tiles + right sidebar with 5 buttons

**Step 6: Commit**

```bash
git add app/terminal/ components/terminal/
git commit -m "feat: add terminal layout shell with sidebar, header, and 6 dashboard tiles"
```

---

## Task 2: Device Auth + Data Fetching for Terminal

**Files:**
- Create: `lib/terminal/useTerminalData.ts`
- Modify: `app/terminal/[token]/layout.tsx`
- Modify: `app/terminal/[token]/page.tsx`
- Modify: `components/terminal/TerminalHeader.tsx`

**Step 1: Create the terminal data hook**

```typescript
// lib/terminal/useTerminalData.ts
"use client";

import { useState, useEffect, useCallback } from "react";

// Typ fuer die Device-API-Antwort
interface DeviceStatus {
  weather: { temp: number | null; icon: string };
  alerts: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
    isEmergency: boolean;
    createdAt: string;
  }>;
  lastCheckin: string | null;
  unreadCount: number;
  news: Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    relevance: number;
    publishedAt: string;
  }>;
  newsCount: number;
  userName: string;
  greeting: string;
}

export function useTerminalData(token: string) {
  const [data, setData] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/device/status?token=${token}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initiales Laden + Polling alle 2 Minuten
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check-in senden
  const sendCheckin = useCallback(async () => {
    const res = await fetch("/api/device/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) await fetchData(); // Daten aktualisieren
    return res.ok;
  }, [token, fetchData]);

  // Alert als gesehen markieren
  const ackAlert = useCallback(async (alertId: string) => {
    const res = await fetch("/api/device/alert-ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, token }),
    });
    return res.ok;
  }, [token]);

  return { data, loading, error, sendCheckin, ackAlert, refresh: fetchData };
}
```

**Step 2: Create terminal context provider**

```typescript
// lib/terminal/TerminalContext.tsx
"use client";

import { createContext, useContext, ReactNode, useState } from "react";
import { useTerminalData } from "./useTerminalData";

type Screen = "home" | "checkin" | "emergency" | "medications" | "video" | "news";

interface TerminalContextType {
  data: ReturnType<typeof useTerminalData>["data"];
  loading: boolean;
  error: string | null;
  sendCheckin: () => Promise<boolean>;
  ackAlert: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  activeScreen: Screen;
  setActiveScreen: (s: Screen) => void;
  token: string;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

export function TerminalProvider({ token, children }: { token: string; children: ReactNode }) {
  const { data, loading, error, sendCheckin, ackAlert, refresh } = useTerminalData(token);
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  return (
    <TerminalContext.Provider value={{
      data, loading, error, sendCheckin, ackAlert, refresh,
      activeScreen, setActiveScreen, token,
    }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error("useTerminal muss innerhalb von TerminalProvider verwendet werden");
  return ctx;
}
```

**Step 3: Wire context into layout, update header with live weather**

Update `layout.tsx` to wrap children with `TerminalProvider`.
Update `TerminalHeader.tsx` to use `useTerminal()` for weather data and user name.
Update `page.tsx` tiles to show real data from `useTerminal()`.

**Step 4: Verify with real device token**

Run: `npm run dev`
Open: `http://localhost:3000/terminal/3fa30af55e89354add5c12ebfcb7a7ed824e8d43fe1cc28cb50f9fc9e8dcc3a0`
Expected: Real weather, greeting, alerts, news from Supabase

**Step 5: Commit**

```bash
git add lib/terminal/ app/terminal/ components/terminal/
git commit -m "feat: add terminal data fetching with device token auth and live weather"
```

---

## Task 3: Check-in Screen

**Files:**
- Create: `components/terminal/screens/CheckinScreen.tsx`
- Modify: `app/terminal/[token]/page.tsx` (render active screen)

**Step 1: Build the check-in screen**

```typescript
// components/terminal/screens/CheckinScreen.tsx
"use client";

import { useState } from "react";
import { Heart, CheckCircle, Frown, AlertTriangle } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

type Mood = "gut" | "nicht_gut" | "hilfe";

export default function CheckinScreen() {
  const { sendCheckin, setActiveScreen } = useTerminal();
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  async function handleCheckin(mood: Mood) {
    setStatus("sending");
    const ok = await sendCheckin();
    if (ok) {
      setStatus("done");
      setTimeout(() => setActiveScreen("home"), 5000);
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <CheckCircle className="w-32 h-32 text-success-green mb-6" />
        <h1 className="text-4xl font-bold text-anthrazit">Vielen Dank!</h1>
        <p className="text-2xl text-anthrazit-light mt-3">
          Ihr Check-in wurde erfasst.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <h1 className="text-3xl font-bold text-anthrazit mb-4">
        Wie geht es Ihnen heute?
      </h1>
      <div className="flex gap-6">
        <button
          onClick={() => handleCheckin("gut")}
          disabled={status === "sending"}
          className="flex flex-col items-center justify-center w-56 h-56 rounded-2xl bg-success-green text-white shadow-lg active:scale-95 transition-transform"
        >
          <Heart className="w-20 h-20 mb-3" strokeWidth={2} />
          <span className="text-2xl font-bold">Mir geht es gut</span>
        </button>
        <button
          onClick={() => handleCheckin("nicht_gut")}
          disabled={status === "sending"}
          className="flex flex-col items-center justify-center w-56 h-56 rounded-2xl bg-alert-amber text-white shadow-lg active:scale-95 transition-transform"
        >
          <Frown className="w-20 h-20 mb-3" strokeWidth={2} />
          <span className="text-2xl font-bold">Nicht so gut</span>
        </button>
        <button
          onClick={() => handleCheckin("hilfe")}
          disabled={status === "sending"}
          className="flex flex-col items-center justify-center w-56 h-56 rounded-2xl bg-emergency-red text-white shadow-lg active:scale-95 transition-transform"
        >
          <AlertTriangle className="w-20 h-20 mb-3" strokeWidth={2} />
          <span className="text-2xl font-bold">Brauche Hilfe</span>
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Wire screen switching in page.tsx**

Replace static tiles with conditional rendering based on `activeScreen` from context.

**Step 3: Verify check-in flow**

Open terminal, tap Check-in in sidebar → 3 mood buttons appear → tap "Mir geht es gut" → success screen → auto-return to home after 5s.

**Step 4: Commit**

```bash
git add components/terminal/screens/ app/terminal/
git commit -m "feat: add terminal check-in screen with mood selection"
```

---

## Task 4: Emergency Screen

**Files:**
- Create: `components/terminal/screens/EmergencyScreen.tsx`

**Step 1: Build the emergency screen**

Full red screen with 112 call button. Follows NOTFALL-BANNER rule: fire/medical/crime → IMMER 112/110 zuerst.

```typescript
// components/terminal/screens/EmergencyScreen.tsx
"use client";

import { Phone, X } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

export default function EmergencyScreen() {
  const { setActiveScreen } = useTerminal();

  return (
    <div className="fixed inset-0 z-50 bg-emergency-red flex flex-col items-center justify-center">
      <button
        onClick={() => setActiveScreen("home")}
        className="absolute top-6 right-6 text-white/70 hover:text-white"
        aria-label="Zurueck"
      >
        <X className="w-12 h-12" />
      </button>

      <Phone className="w-32 h-32 text-white mb-8 animate-pulse" strokeWidth={2.5} />

      <h1 className="text-6xl font-black text-white mb-4">NOTRUF</h1>
      <p className="text-3xl text-white/90 mb-12">
        Rufen Sie sofort den Rettungsdienst
      </p>

      <a
        href="tel:112"
        className="bg-white text-emergency-red text-4xl font-black px-16 py-8 rounded-2xl shadow-2xl active:scale-95 transition-transform"
      >
        112 ANRUFEN
      </a>

      <p className="text-xl text-white/70 mt-8">
        Polizei: 110 &middot; Giftnotruf: 0761 19240
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/terminal/screens/EmergencyScreen.tsx
git commit -m "feat: add terminal emergency screen with 112 call button"
```

---

## Task 5: Medications Screen

**Files:**
- Create: `components/terminal/screens/MedicationsScreen.tsx`
- Create: `app/api/terminal/medications/route.ts`

**Step 1: Create the medications API endpoint**

```typescript
// app/api/terminal/medications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authResult = await authenticateDevice(request);
  if (isAuthError(authResult)) return authResult;

  const { device } = authResult;
  const supabase = await createClient();

  // Haushaltsmitglieder finden
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ medications: [], logs: [] });
  }

  // Medikamente des Seniors laden
  const { data: medications } = await supabase
    .from("care_medications")
    .select("*")
    .in("senior_id", userIds)
    .eq("active", true)
    .order("time_of_day", { ascending: true });

  // Heutige Logs laden
  const today = new Date().toISOString().split("T")[0];
  const { data: logs } = await supabase
    .from("care_medication_logs")
    .select("*")
    .in("medication_id", (medications ?? []).map((m) => m.id))
    .gte("taken_at", `${today}T00:00:00`)
    .lte("taken_at", `${today}T23:59:59`);

  return NextResponse.json({
    medications: medications ?? [],
    logs: logs ?? [],
  });
}
```

**Step 2: Build the medications screen component**

Shows medication list with times, take-confirmation buttons, and today's compliance.

**Step 3: Commit**

```bash
git add app/api/terminal/medications/ components/terminal/screens/MedicationsScreen.tsx
git commit -m "feat: add terminal medications screen with confirmation flow"
```

---

## Task 6: News Screen

**Files:**
- Create: `components/terminal/screens/NewsScreen.tsx`

**Step 1: Build news screen with card layout**

Uses data from `useTerminal().data.news` — already fetched by device status API.
Large cards, easy to read, tap for detail overlay.

**Step 2: Commit**

```bash
git add components/terminal/screens/NewsScreen.tsx
git commit -m "feat: add terminal news screen with large readable cards"
```

---

## Task 7: Night Mode (Ambient Display)

**Files:**
- Create: `components/terminal/NightMode.tsx`
- Modify: `app/terminal/[token]/layout.tsx`

**Step 1: Build the night mode overlay**

```typescript
// components/terminal/NightMode.tsx
"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function NightMode({ onWake }: { onWake: () => void }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center cursor-pointer"
      onClick={onWake}
      style={{ opacity: 0.9 }}
    >
      {/* Grosse Uhr */}
      <p className="text-8xl font-light text-white/60 tabular-nums mb-4">
        {timeStr}
      </p>
      <p className="text-2xl text-white/30">
        {time.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {/* Notruf immer sichtbar */}
      <a
        href="tel:112"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-12 flex items-center gap-3 bg-emergency-red/80 text-white px-8 py-4 rounded-xl"
      >
        <AlertTriangle className="w-8 h-8" />
        <span className="text-xl font-bold">NOTRUF 112</span>
      </a>
    </div>
  );
}
```

**Step 2: Add night mode logic to layout**

Check time: 22:00-07:00 → show NightMode overlay. Touch → wake for 30 seconds then return to night mode. Also activate after 5 min idle.

**Step 3: Commit**

```bash
git add components/terminal/NightMode.tsx app/terminal/
git commit -m "feat: add terminal night mode with dimmed clock and emergency button"
```

---

## Task 8: Family Dashboard

**Files:**
- Create: `app/family/[token]/page.tsx`
- Create: `app/family/[token]/layout.tsx`
- Create: `app/api/family/status/route.ts`
- Create: `lib/family/useFamilyData.ts`

**Step 1: Create the family API endpoint**

Returns check-in status, medication compliance, last activity — for a specific household identified by a family-token.

```typescript
// app/api/family/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Wiederverwendung der Device-Token-Auth
  const authResult = await authenticateDevice(request);
  if (isAuthError(authResult)) return authResult;

  const { device } = authResult;
  const supabase = await createClient();

  // Letzte 7 Check-ins
  const { data: checkins } = await supabase
    .from("care_checkins")
    .select("*")
    .eq("household_id", device.household_id)
    .order("completed_at", { ascending: false })
    .limit(7);

  // Heutige Medikamenten-Compliance
  const today = new Date().toISOString().split("T")[0];
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id);

  const userIds = (members ?? []).map((m) => m.user_id);

  const { count: totalMeds } = await supabase
    .from("care_medications")
    .select("id", { count: "exact", head: true })
    .in("senior_id", userIds)
    .eq("active", true);

  const { count: takenMeds } = await supabase
    .from("care_medication_logs")
    .select("id", { count: "exact", head: true })
    .gte("taken_at", `${today}T00:00:00`)
    .lte("taken_at", `${today}T23:59:59`);

  // Aktive Alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, category, title, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    checkins: checkins ?? [],
    todayCheckinDone: (checkins ?? []).some(
      (c) => c.completed_at?.startsWith(today)
    ),
    medicationCompliance: {
      total: totalMeds ?? 0,
      taken: takenMeds ?? 0,
    },
    alerts: alerts ?? [],
    lastSeen: device.last_seen_at,
  });
}
```

**Step 2: Build the family dashboard UI**

Mobile-optimized page showing:
- Check-in Status (gruen/gelb/rot Ampel)
- Letzte 7 Tage Check-in Verlauf
- Medikamenten-Compliance (% Balken)
- Aktive Alerts
- "Anrufen" Button (startet Sprechstunde in Phase 2)

**Step 3: Commit**

```bash
git add app/family/ app/api/family/ lib/family/
git commit -m "feat: add family dashboard with check-in status and medication compliance"
```

---

## Task 9: GPIO-Bridge (Python Service)

**Files:**
- Create: `raspberry-pi/gpio-bridge/bridge.py`
- Create: `raspberry-pi/gpio-bridge/requirements.txt`
- Create: `raspberry-pi/gpio-bridge/gpio-bridge.service`

**Step 1: Create the Python WebSocket bridge**

```python
# raspberry-pi/gpio-bridge/bridge.py
"""
GPIO-Bridge fuer Nachbar.io Senioren-Terminal
WebSocket-Server auf localhost:8765
Steuert: Buzzer, LED, Display-Helligkeit
"""
import asyncio
import json
import logging
from datetime import datetime

try:
    from gpiozero import Buzzer, LED
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    logging.warning("gpiozero nicht verfuegbar — GPIO deaktiviert")

import websockets

# GPIO Pins (wie ESP32 Companion)
BUZZER_PIN = 45
LED_PIN = 6

buzzer = Buzzer(BUZZER_PIN) if GPIO_AVAILABLE else None
led = LED(LED_PIN) if GPIO_AVAILABLE else None

# Buzzer-Muster
PATTERNS = {
    "medication": [(0.2, 0.1)] * 3,    # 3x kurz piepen
    "checkin": [(0.5, 0.0)],            # 1x lang
    "emergency": [(0.1, 0.1)] * 10,     # 10x schnell
    "alert": [(0.3, 0.2)] * 2,          # 2x mittel
}

async def play_buzzer(pattern_name: str):
    """Buzzer-Muster abspielen"""
    if not buzzer:
        return
    pattern = PATTERNS.get(pattern_name, PATTERNS["alert"])
    for on_time, off_time in pattern:
        buzzer.on()
        await asyncio.sleep(on_time)
        buzzer.off()
        if off_time > 0:
            await asyncio.sleep(off_time)

async def set_led(mode: str):
    """LED-Modus setzen"""
    if not led:
        return
    if mode == "on":
        led.on()
    elif mode == "off":
        led.off()
    elif mode == "blink":
        led.blink(on_time=0.5, off_time=2.5)

async def set_brightness(level: int):
    """Display-Helligkeit (0-255)"""
    try:
        with open("/sys/class/backlight/rpi_backlight/brightness", "w") as f:
            f.write(str(max(10, min(255, level))))
    except FileNotFoundError:
        logging.warning("Backlight nicht verfuegbar")

async def handle_message(websocket):
    """WebSocket-Nachrichten verarbeiten"""
    async for message in websocket:
        try:
            cmd = json.loads(message)
            action = cmd.get("action")

            if action == "buzzer":
                await play_buzzer(cmd.get("pattern", "alert"))
                await websocket.send(json.dumps({"ok": True}))

            elif action == "led":
                await set_led(cmd.get("mode", "off"))
                await websocket.send(json.dumps({"ok": True}))

            elif action == "brightness":
                await set_brightness(cmd.get("level", 255))
                await websocket.send(json.dumps({"ok": True}))

            elif action == "ping":
                await websocket.send(json.dumps({"ok": True, "time": datetime.now().isoformat()}))

            else:
                await websocket.send(json.dumps({"ok": False, "error": "Unbekannte Aktion"}))

        except json.JSONDecodeError:
            await websocket.send(json.dumps({"ok": False, "error": "Ungültiges JSON"}))

async def heartbeat():
    """LED blinkt alle 3 Sekunden als Heartbeat"""
    while True:
        await set_led("blink")
        await asyncio.sleep(3)

async def main():
    logging.basicConfig(level=logging.INFO)
    logging.info("GPIO-Bridge gestartet auf ws://localhost:8765")

    async with websockets.serve(handle_message, "localhost", 8765):
        await asyncio.Future()  # Laeuft endlos

if __name__ == "__main__":
    asyncio.run(main())
```

**Step 2: Create requirements.txt**

```
gpiozero>=2.0
websockets>=12.0
```

**Step 3: Create systemd service**

```ini
# raspberry-pi/gpio-bridge/gpio-bridge.service
[Unit]
Description=Nachbar.io GPIO Bridge
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/bin/python3 /home/pi/nachbar-terminal/gpio-bridge/bridge.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Step 4: Commit**

```bash
git add raspberry-pi/
git commit -m "feat: add Python GPIO bridge for buzzer, LED, and display brightness"
```

---

## Task 10: Raspberry Pi Setup Script

**Files:**
- Create: `raspberry-pi/setup.sh`
- Create: `raspberry-pi/kiosk.service`
- Create: `raspberry-pi/cage-kiosk.sh`
- Create: `raspberry-pi/README.md`

**Step 1: Create the automated setup script**

```bash
#!/bin/bash
# raspberry-pi/setup.sh
# Nachbar.io Senioren-Terminal — Raspberry Pi 5 Setup
# Ausfuehren nach erstem Boot mit: sudo bash setup.sh <DEVICE_TOKEN>

set -e

DEVICE_TOKEN="${1:?Bitte Device-Token als Argument uebergeben}"
TERMINAL_URL="https://nachbar-io.vercel.app/terminal/${DEVICE_TOKEN}"

echo "=== Nachbar.io Terminal Setup ==="
echo "Token: ${DEVICE_TOKEN:0:8}..."
echo "URL: ${TERMINAL_URL}"

# 1. System aktualisieren
echo ">>> System aktualisieren..."
apt-get update && apt-get upgrade -y

# 2. Pakete installieren
echo ">>> Pakete installieren..."
apt-get install -y \
  cage chromium-browser \
  python3-pip python3-gpiozero \
  unattended-upgrades \
  openssh-server

# 3. Python-Abhaengigkeiten
pip3 install websockets

# 4. Terminal-Verzeichnis erstellen
mkdir -p /home/pi/nachbar-terminal/gpio-bridge
cp gpio-bridge/bridge.py /home/pi/nachbar-terminal/gpio-bridge/
cp gpio-bridge/requirements.txt /home/pi/nachbar-terminal/gpio-bridge/

# 5. Kiosk-Startskript
cat > /home/pi/nachbar-terminal/start-kiosk.sh << KIOSK
#!/bin/bash
# Warte auf Netzwerk
sleep 5
exec cage -- chromium-browser \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --disable-translate \\
  --no-first-run \\
  --start-fullscreen \\
  --autoplay-policy=no-user-gesture-required \\
  "${TERMINAL_URL}"
KIOSK
chmod +x /home/pi/nachbar-terminal/start-kiosk.sh

# 6. Systemd Services installieren
cat > /etc/systemd/system/nachbar-kiosk.service << SERVICE
[Unit]
Description=Nachbar.io Kiosk Terminal
After=graphical.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/home/pi/nachbar-terminal/start-kiosk.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
SERVICE

cp gpio-bridge/gpio-bridge.service /etc/systemd/system/

# 7. Services aktivieren
systemctl daemon-reload
systemctl enable nachbar-kiosk.service
systemctl enable gpio-bridge.service

# 8. Hardware-Watchdog aktivieren
echo "RuntimeWatchdogSec=30" >> /etc/systemd/system.conf

# 9. Bildschirmschoner deaktivieren (Nachtmodus uebernimmt)
echo "xserver-command=X -s 0 -dpms" >> /etc/lightdm/lightdm.conf 2>/dev/null || true

# 10. Auto-Login fuer User pi
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << AUTO
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I \$TERM
AUTO

echo "=== Setup abgeschlossen! ==="
echo "Neustart mit: sudo reboot"
echo "Terminal wird automatisch starten."
```

**Step 2: Create README with setup instructions**

Document: hardware requirements, flashing Pi OS, running setup.sh, WiFi configuration, troubleshooting.

**Step 3: Commit**

```bash
git add raspberry-pi/
git commit -m "feat: add Raspberry Pi setup script with kiosk and GPIO service"
```

---

## Task 11: GPIO WebSocket Client in Terminal UI

**Files:**
- Create: `lib/terminal/useGpioBridge.ts`
- Modify: `components/terminal/screens/CheckinScreen.tsx` (add buzzer feedback)
- Modify: `components/terminal/screens/EmergencyScreen.tsx` (add buzzer + LED)
- Modify: `components/terminal/NightMode.tsx` (dim brightness)

**Step 1: Create the WebSocket hook**

```typescript
// lib/terminal/useGpioBridge.ts
"use client";

import { useCallback, useRef, useEffect } from "react";

export function useGpioBridge() {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Nur auf dem Pi verbinden (localhost)
    try {
      ws.current = new WebSocket("ws://localhost:8765");
      ws.current.onerror = () => {
        console.log("GPIO-Bridge nicht verfuegbar (normal auf Desktop)");
      };
    } catch {
      // Nicht auf dem Pi — ignorieren
    }
    return () => ws.current?.close();
  }, []);

  const send = useCallback((cmd: Record<string, unknown>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(cmd));
    }
  }, []);

  const buzzer = useCallback((pattern: string) => {
    send({ action: "buzzer", pattern });
  }, [send]);

  const led = useCallback((mode: string) => {
    send({ action: "led", mode });
  }, [send]);

  const brightness = useCallback((level: number) => {
    send({ action: "brightness", level });
  }, [send]);

  return { buzzer, led, brightness };
}
```

**Step 2: Integrate buzzer into check-in and emergency screens**

**Step 3: Commit**

```bash
git add lib/terminal/useGpioBridge.ts components/terminal/
git commit -m "feat: add GPIO bridge WebSocket client for buzzer, LED, brightness"
```

---

## Task 12: Video Call Screen (Telemedizin Vorbereitung)

**Files:**
- Create: `components/terminal/screens/VideoScreen.tsx`

**Step 1: Build placeholder video screen**

WebRTC-Integration ist Phase 2. Fuer Phase 1: "Sprechstunde"-Screen mit Terminliste und "Arzt anrufen" Button (deaktiviert mit "Bald verfuegbar" Hinweis).

**Step 2: Commit**

```bash
git add components/terminal/screens/VideoScreen.tsx
git commit -m "feat: add terminal video call placeholder screen for telemedizin"
```

---

## Task 13: Integration Tests

**Files:**
- Create: `app/api/terminal/medications/route.test.ts`
- Create: `app/api/family/status/route.test.ts`
- Create: `tests/e2e/scenarios/s11-terminal.spec.ts`

**Step 1: Write unit tests for terminal medications API**

**Step 2: Write unit tests for family status API**

**Step 3: Write E2E test for terminal flow**

Test: Open terminal URL → verify tiles render → tap check-in → verify success → tap news → verify news cards.

**Step 4: Run all tests**

```bash
npm run test
npm run test:e2e -- --project=chromium tests/e2e/scenarios/s11-terminal.spec.ts
```

**Step 5: Commit**

```bash
git add tests/ app/api/terminal/ app/api/family/
git commit -m "test: add terminal and family dashboard integration tests"
```

---

## Summary

| Task | Beschreibung | Geschaetzter Aufwand |
|------|-------------|---------------------|
| 1 | Terminal Layout Shell (6 Tiles + Sidebar) | 30 min |
| 2 | Device Auth + Data Fetching | 45 min |
| 3 | Check-in Screen | 30 min |
| 4 | Emergency Screen | 15 min |
| 5 | Medications Screen + API | 45 min |
| 6 | News Screen | 20 min |
| 7 | Night Mode | 30 min |
| 8 | Family Dashboard + API | 60 min |
| 9 | GPIO-Bridge (Python) | 30 min |
| 10 | Pi Setup Script | 30 min |
| 11 | GPIO WebSocket Client | 20 min |
| 12 | Video Call Placeholder | 15 min |
| 13 | Integration Tests | 45 min |
| **Total** | | **~6.5 Stunden** |

## Phase 2 (spaeter)
- WebRTC Video-Sprechstunde
- Bluetooth Vitaldaten
- Sprachsteuerung (Web Speech API)
- Foto-Rahmen Screensaver
- Sturzerkennung
