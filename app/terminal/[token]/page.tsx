"use client";

import {
  Home,
  Bell,
  Pill,
  Newspaper,
  CalendarDays,
  Video,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useTerminal, type TerminalScreen } from "@/lib/terminal/TerminalContext";
import CheckinScreen from "@/components/terminal/screens/CheckinScreen";
import EmergencyScreen from "@/components/terminal/screens/EmergencyScreen";
import MedicationsScreen from "@/components/terminal/screens/MedicationsScreen";
import NewsScreen from "@/components/terminal/screens/NewsScreen";
import VideoCallScreen from "@/components/terminal/screens/VideoCallScreen";

/**
 * Terminal-Seite: Rendert den aktiven Bildschirm basierend auf TerminalContext.
 * Home = 6-Kachel-Dashboard, andere Screens werden direkt eingeblendet.
 */
export default function TerminalPage() {
  const { activeScreen } = useTerminal();

  switch (activeScreen) {
    case "checkin":
      return <CheckinScreen />;
    case "emergency":
      return <EmergencyScreen />;
    case "medications":
      return <MedicationsScreen />;
    case "news":
      return <NewsScreen />;
    case "video":
      return <VideoCallScreen />;
    case "home":
    default:
      return <DashboardGrid />;
  }
}

// --- Dashboard-Grid (Home-Ansicht) ---

interface DashboardTile {
  key: string;
  screen: TerminalScreen;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
}

function DashboardGrid() {
  const { data, loading, error, setActiveScreen } = useTerminal();

  // Ladezustand
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-20 w-20 animate-spin text-quartier-green" />
        <p className="text-3xl text-anthrazit font-medium">Daten werden geladen...</p>
      </div>
    );
  }

  // Fehlerzustand
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-20 w-20 text-alert-amber" />
        <p className="text-3xl text-anthrazit font-medium">Verbindungsfehler</p>
        <p className="text-[28px] text-anthrazit/70">{error}</p>
      </div>
    );
  }

  // Letztes Check-in formatieren
  const lastCheckinText = data?.lastCheckin
    ? `Letztes: ${new Date(data.lastCheckin).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })} Uhr`
    : "Noch nicht eingecheckt";

  // Alerts-Subtitle
  const alertsSubtitle = data && data.alerts.length > 0
    ? `${data.alerts.length} ${data.alerts.length === 1 ? "Meldung" : "Meldungen"}`
    : "Keine neuen";

  // News-Subtitle
  const newsSubtitle = data && data.newsCount > 0
    ? `${data.newsCount} ${data.newsCount === 1 ? "Artikel" : "Artikel"}`
    : "Keine neuen";

  // Kacheln mit Live-Daten
  const tiles: DashboardTile[] = [
    {
      key: "home",
      screen: "checkin",
      title: data?.greeting ?? "Willkommen",
      subtitle: lastCheckinText,
      icon: Home,
      bgColor: "bg-quartier-green",
      textColor: "text-white",
    },
    {
      key: "alerts",
      screen: "emergency",
      title: "Meldungen",
      subtitle: alertsSubtitle,
      icon: Bell,
      bgColor: "bg-alert-amber",
      textColor: "text-anthrazit",
    },
    {
      key: "medications",
      screen: "medications",
      title: "Medikamente",
      subtitle: "Alles eingenommen",
      icon: Pill,
      bgColor: "bg-info-blue",
      textColor: "text-white",
    },
    {
      key: "news",
      screen: "news",
      title: "Neuigkeiten",
      subtitle: newsSubtitle,
      icon: Newspaper,
      bgColor: "bg-anthrazit",
      textColor: "text-white",
    },
    {
      key: "events",
      screen: "home",
      title: "Termine",
      subtitle: "Heute keine",
      icon: CalendarDays,
      bgColor: "bg-quartier-green-dark",
      textColor: "text-white",
    },
    {
      key: "video",
      screen: "video",
      title: "Sprechstunde",
      subtitle: "Naechste: --:--",
      icon: Video,
      bgColor: "bg-anthrazit-light",
      textColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-5 h-full">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            onClick={() => setActiveScreen(tile.screen)}
            className={`flex flex-col items-center justify-center gap-3 rounded-3xl ${tile.bgColor} ${tile.textColor} shadow-soft transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-quartier-green`}
          >
            <Icon className="h-16 w-16" />
            <span className="text-[44px] font-bold">{tile.title}</span>
            <span className="text-2xl opacity-90">{tile.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
