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
      // TODO Task 5: MedicationsScreen
      return <PlaceholderScreen title="Medikamente" />;
    case "news":
      // TODO Task 6: NewsScreen
      return <PlaceholderScreen title="Neuigkeiten" />;
    case "video":
      // TODO Task 12: VideoCallScreen
      return <PlaceholderScreen title="Sprechstunde" />;
    case "home":
    default:
      return <DashboardGrid />;
  }
}

// Platzhalter fuer noch nicht implementierte Screens
function PlaceholderScreen({ title }: { title: string }) {
  const { setActiveScreen } = useTerminal();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <p className="text-3xl font-bold text-anthrazit">{title}</p>
      <p className="text-xl text-anthrazit/60">Wird bald verfuegbar sein</p>
      <button
        onClick={() => setActiveScreen("home")}
        className="mt-4 rounded-xl bg-quartier-green px-8 py-4 text-xl font-bold text-white active:scale-95"
      >
        Zurueck
      </button>
    </div>
  );
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
        <Loader2 className="h-16 w-16 animate-spin text-quartier-green" />
        <p className="text-2xl text-anthrazit font-medium">Daten werden geladen...</p>
      </div>
    );
  }

  // Fehlerzustand
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-16 w-16 text-alert-amber" />
        <p className="text-2xl text-anthrazit font-medium">Verbindungsfehler</p>
        <p className="text-lg text-anthrazit/70">{error}</p>
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
    <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            onClick={() => setActiveScreen(tile.screen)}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl ${tile.bgColor} ${tile.textColor} shadow-soft transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-quartier-green`}
          >
            <Icon className="h-12 w-12" />
            <span className="text-2xl font-bold">{tile.title}</span>
            <span className="text-lg opacity-80">{tile.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
