"use client";

import {
  Smile,
  MessageSquare,
  Newspaper,
  Bell,
  Video,
  Camera,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useTerminal, type TerminalScreen } from "@/lib/terminal/TerminalContext";
import CheckinScreen from "@/components/terminal/screens/CheckinScreen";
import NewsScreen from "@/components/terminal/screens/NewsScreen";
import WichtigeNummernScreen from "@/components/terminal/screens/WichtigeNummernScreen";
import ErinnerungenScreen from "@/components/terminal/screens/ErinnerungenScreen";
import FamilienFotosScreen from "@/components/terminal/screens/FamilienFotosScreen";
import VideochatScreen from "@/components/terminal/screens/VideochatScreen";
import KioskActiveCall from "@/components/terminal/video/KioskActiveCall";
import KioskAudioOnlyScreen from "@/components/terminal/video/KioskAudioOnlyScreen";

/**
 * Terminal-Seite: Rendert den aktiven Bildschirm basierend auf TerminalContext.
 * Home = 6-Kachel-Dashboard, andere Screens werden direkt eingeblendet.
 */
export default function TerminalPage() {
  const { activeScreen, activeCall, setActiveCall, setActiveScreen } = useTerminal();

  switch (activeScreen) {
    case "checkin":
      return <CheckinScreen />;
    case "board":
    case "news":
      return <NewsScreen />;
    case "reminders":
      return <ErinnerungenScreen />;
    case "videochat":
      return <VideochatScreen />;
    case "photos":
      return <FamilienFotosScreen />;
    case "emergency-numbers":
      return <WichtigeNummernScreen />;
    case "active-call":
      if (!activeCall) return <DashboardGrid />;
      if (activeCall.mediaMode === 'audio-only') {
        return (
          <KioskAudioOnlyScreen
            callerName={activeCall.remoteName}
            callerAvatar={null}
            onHangup={() => { setActiveCall(null); setActiveScreen('home'); }}
            onRetryVideo={() => setActiveCall({ ...activeCall, mediaMode: 'video' })}
          />
        );
      }
      return (
        <KioskActiveCall
          callId={activeCall.callId}
          remoteUserId={activeCall.remoteUserId}
          callerName={activeCall.remoteName}
          isInitiator={activeCall.isInitiator}
          incomingOffer={activeCall.offer}
          onHangup={() => { setActiveCall(null); setActiveScreen('home'); }}
          onAudioOnly={() => setActiveCall({ ...activeCall, mediaMode: 'audio-only' })}
        />
      );
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
}

function DashboardGrid() {
  const { data, loading, error, setActiveScreen } = useTerminal();

  // Ladezustand
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-20 w-20 animate-spin text-quartier-green" />
        <p className="text-[32px] text-anthrazit font-medium">Daten werden geladen...</p>
      </div>
    );
  }

  // Fehlerzustand
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <TriangleAlert className="h-20 w-20 text-alert-amber" />
        <p className="text-[32px] text-anthrazit font-medium">Verbindungsfehler</p>
        <p className="text-[24px] text-anthrazit/70">{error}</p>
      </div>
    );
  }

  // Check-in Subtitle
  const checkinSubtitle = data?.lastCheckin
    ? `Letztes: ${new Date(data.lastCheckin).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })} Uhr`
    : "Heute noch nicht geteilt";

  // Schwarzes Brett Subtitle
  const boardSubtitle = data && data.alerts.length > 0
    ? `${data.alerts.length} neue ${data.alerts.length === 1 ? "Nachricht" : "Nachrichten"}`
    : "Keine neuen";

  // News Subtitle
  const newsSubtitle = data && data.newsCount > 0
    ? `${data.newsCount} ${data.newsCount === 1 ? "Artikel" : "Artikel"}`
    : "Keine neuen";

  // Erinnerungen Subtitle
  const remindersSubtitle = data
    ? data.stickiesCount > 0 || data.appointmentsToday > 0
      ? [
          data.stickiesCount > 0 ? `${data.stickiesCount} Notiz${data.stickiesCount !== 1 ? "en" : ""}` : "",
          data.appointmentsToday > 0 ? `${data.appointmentsToday} Termin${data.appointmentsToday !== 1 ? "e" : ""}` : "",
        ].filter(Boolean).join(" + ")
      : "Keine neuen"
    : "Laden...";

  // Fotos Subtitle
  const photosSubtitle = data
    ? data.photosCount > 0
      ? `${data.photosCount} ${data.photosCount === 1 ? "Foto" : "Fotos"}`
      : "Noch keine Fotos"
    : "Laden...";

  const tiles: DashboardTile[] = [
    {
      key: "checkin",
      screen: "checkin",
      title: "Wie geht's mir?",
      subtitle: checkinSubtitle,
      icon: Smile,
      bgColor: "bg-[#4CAF87]",
    },
    {
      key: "board",
      screen: "board",
      title: "Schwarzes Brett",
      subtitle: boardSubtitle,
      icon: MessageSquare,
      bgColor: "bg-[#F59E0B]",
    },
    {
      key: "news",
      screen: "news",
      title: "Neuigkeiten",
      subtitle: newsSubtitle,
      icon: Newspaper,
      bgColor: "bg-[#2D3142]",
    },
    {
      key: "reminders",
      screen: "reminders",
      title: "Erinnerungen",
      subtitle: remindersSubtitle,
      icon: Bell,
      bgColor: "bg-[#3A8F6E]",
    },
    {
      key: "videochat",
      screen: "videochat",
      title: "Videochat",
      subtitle: "Angehörige anrufen",
      icon: Video,
      bgColor: "bg-[#3B82F6]",
    },
    {
      key: "photos",
      screen: "photos",
      title: "Familienfotos",
      subtitle: photosSubtitle,
      icon: Camera,
      bgColor: "bg-[#4B5563]",
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
            className={`flex flex-col items-center justify-center gap-3 rounded-3xl ${tile.bgColor} text-white shadow-soft transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-quartier-green`}
          >
            <Icon className="h-14 w-14" />
            <span className="text-[40px] font-bold leading-tight">{tile.title}</span>
            <span className="text-[22px] opacity-90">{tile.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
