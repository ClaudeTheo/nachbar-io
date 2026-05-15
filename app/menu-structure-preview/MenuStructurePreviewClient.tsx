"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Heart,
  HeartPulse,
  Home,
  Map,
  MessageCircle,
  Newspaper,
  PackageOpen,
  Pill,
  Repeat2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Share2,
  Stethoscope,
  Trophy,
  User,
  UserPlus,
  UsersRound,
  type LucideProps,
} from "lucide-react";

type RoleId = "aktiv" | "komfort" | "jugend" | "einfach";
type VariantId = "current" | "proposed";

type IconComponent = ComponentType<LucideProps>;

type NavItem = {
  label: string;
  href: string;
  icon: IconComponent;
};

type MenuEntry = {
  label: string;
  href: string;
  icon: IconComponent;
  note: string;
};

type MenuGroup = {
  title: string;
  subtitle: string;
  tone: "green" | "blue" | "amber" | "rose" | "slate";
  items: MenuEntry[];
};

type Structure = {
  headline: string;
  bottomNav: NavItem[];
  topActions: MenuEntry[];
  groups: MenuGroup[];
  feel: string[];
  decisions: string[];
};

const roles: Array<{ id: RoleId; label: string; description: string }> = [
  {
    id: "aktiv",
    label: "Aktiv",
    description: "Normales Quartier-Dashboard mit hoher Funktionsdichte.",
  },
  {
    id: "komfort",
    label: "Komfort",
    description: "Ruhiger Alltag, Pflege und Status sichtbar, weniger Druck.",
  },
  {
    id: "jugend",
    label: "Jugend",
    description: "Map, Gruppen, Tauschen und Missionen bleiben im Vordergrund.",
  },
  {
    id: "einfach",
    label: "Einfach",
    description: "Sehr große Kacheln, wenige Wege, Notfall immer klar.",
  },
];

const toneClasses = {
  green: "border-[#4CAF87]/30 bg-[#4CAF87]/10 text-[#1f5f4b]",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
} satisfies Record<MenuGroup["tone"], string>;

const currentStructures: Record<RoleId, Structure> = {
  aktiv: {
    headline: "Heute: viel ist erreichbar, aber mehrere Einstiege konkurrieren.",
    bottomNav: [
      { label: "Start", href: "/dashboard", icon: Home },
      { label: "Quartier", href: "/quartier-info", icon: Building2 },
      { label: "Gesundheit", href: "/care", icon: Heart },
      { label: "Ich", href: "/profile", icon: User },
    ],
    topActions: [
      {
        label: "Check-in",
        href: "/care/checkin",
        icon: CheckCircle2,
        note: "Pflege liegt sehr prominent auf dem Aktiv-Start.",
      },
      {
        label: "Nachrichten",
        href: "/notifications",
        icon: Bell,
        note: "Doppelt mit Glocke im Header.",
      },
      {
        label: "Neuigkeiten",
        href: "/news",
        icon: Newspaper,
        note: "Rathaus/Quartier-News sind getrennt.",
      },
      {
        label: "Rathaus",
        href: "/city-services",
        icon: Building2,
        note: "Gehört in denselben Quartier-Bereich.",
      },
    ],
    groups: [
      {
        title: "Nachbarschaft",
        subtitle: "Brett, Hilfe, Markt, Gruppen, Events",
        tone: "green",
        items: [
          { label: "Brett", href: "/board", icon: MessageCircle, note: "Allgemeine Beiträge." },
          { label: "Hilfe", href: "/hilfe", icon: Heart, note: "Suchen und anbieten vermischt." },
          { label: "Marktplatz", href: "/marketplace", icon: ShoppingBag, note: "Überschneidet mit Teilen." },
          { label: "Gruppen", href: "/gruppen", icon: UsersRound, note: "Sozialer Bereich." },
        ],
      },
      {
        title: "Hilfe & Pflege",
        subtitle: "Mein Tag, Aufgaben, Einkauf, Pflegegrad",
        tone: "rose",
        items: [
          { label: "Mein Tag", href: "/my-day", icon: CalendarDays, note: "Alltag und Pflege." },
          { label: "Pflegegrad", href: "/pflegegrad-navigator", icon: ShieldCheck, note: "Gut, aber schwerer Kontext." },
          { label: "Einkauf", href: "/care/shopping", icon: ShoppingBag, note: "Hilfe oder Pflege?" },
        ],
      },
      {
        title: "Mehr",
        subtitle: "Viele Einzelmodule nebeneinander",
        tone: "slate",
        items: [
          { label: "Leihbörse", href: "/leihboerse", icon: Repeat2, note: "Doppelt nahe am Marktplatz." },
          { label: "Wer hat?", href: "/whohas", icon: Search, note: "Doppelt nahe an Teilen." },
          { label: "Pakete", href: "/packages", icon: PackageOpen, note: "Kann als Quartier-Service leben." },
        ],
      },
    ],
    feel: [
      "Der Start wirkt voll und nützlich, aber nicht eindeutig.",
      "Gesundheit bekommt bei Aktiv mehr Gewicht als Hilfe.",
      "Teilen/Markt ist über mehrere Namen verteilt.",
    ],
    decisions: [
      "Nachrichten-Kachel entfernen, weil die Glocke bereits denselben Job hat.",
      "Rathaus, News, Müll und Mängel unter Quartier bündeln.",
      "Marktplatz, Leihbörse, Wer hat, Pakete und Fundbüro als Teilen bündeln.",
    ],
  },
  komfort: {
    headline: "Heute: Komfort bekommt Pflege, aber die Ruhe ist noch nicht konsequent.",
    bottomNav: [
      { label: "Übersicht", href: "/dashboard", icon: Home },
      { label: "Status", href: "/care/status", icon: Heart },
      { label: "Gesundheit", href: "/care", icon: HeartPulse },
      { label: "Ich", href: "/profile", icon: User },
    ],
    topActions: [
      { label: "Status", href: "/care/status", icon: Heart, note: "Richtig prominent." },
      { label: "Check-in", href: "/care/checkin", icon: CheckCircle2, note: "Guter täglicher Einstieg." },
      { label: "Termine", href: "/care/termine", icon: CalendarDays, note: "Gehört zur Gesundheit." },
      { label: "Nachrichten", href: "/notifications", icon: Bell, note: "Doppelt mit Header." },
    ],
    groups: [
      {
        title: "Gesundheit",
        subtitle: "Care-Hub mit vielen Einzelpunkten",
        tone: "rose",
        items: [
          { label: "Medikamente", href: "/care/medications", icon: Pill, note: "Sensibel, aber passend." },
          { label: "Ärzte", href: "/care/aerzte", icon: Stethoscope, note: "Später für Arzt-Portal anschlussfähig." },
          { label: "Sprechstunde", href: "/care/sprechstunde", icon: MessageCircle, note: "Noch stark produktabhängig." },
        ],
      },
      {
        title: "Quartier",
        subtitle: "Karte, Rathaus und Meldungen stehen außerhalb",
        tone: "blue",
        items: [
          { label: "Karte", href: "/map", icon: Map, note: "Für Komfort besser sekundär." },
          { label: "Rathaus", href: "/city-services", icon: Building2, note: "Nützlich, aber nicht täglich." },
        ],
      },
    ],
    feel: [
      "Der Pflege-Fokus stimmt, aber es sind noch viele laute Einstiegspunkte.",
      "Status und Gesundheit sind sauber getrennt.",
      "Quartier-Funktionen sollten ruhiger und tiefer liegen.",
    ],
    decisions: [
      "Komfort behält Status + Gesundheit als Hauptwege.",
      "Nachrichten nur über Header, nicht als eigene Start-Kachel.",
      "Quartier als kleiner ruhiger Bereich, nicht als zweite volle Startseite.",
    ],
  },
  jugend: {
    headline: "Heute: Jugend ist schon klarer als die anderen Modi.",
    bottomNav: [
      { label: "Start", href: "/jugend", icon: Home },
      { label: "Karte", href: "/map", icon: Map },
      { label: "Tauschen", href: "/jugend/tauschen", icon: Repeat2 },
      { label: "Gruppen", href: "/jugend/gruppen", icon: UsersRound },
    ],
    topActions: [
      { label: "Missionen", href: "/jugend/aufgaben", icon: ClipboardList, note: "Guter spielerischer Einstieg." },
      { label: "Karte", href: "/map", icon: Map, note: "Doppelt mit Bottom-Tab, aber bewusst wichtig." },
      { label: "Badges", href: "/jugend/badges", icon: ShieldCheck, note: "Motivation." },
      { label: "Tauschen", href: "/jugend/tauschen", icon: Repeat2, note: "Auch Bottom-Tab." },
    ],
    groups: [
      {
        title: "Interessen",
        subtitle: "Lernen, Treffen, Schenken, Sport, Events",
        tone: "amber",
        items: [
          { label: "Lernen", href: "/jugend?tag=lernen", icon: Newspaper, note: "Filter statt eigener Bereich." },
          { label: "Treffen", href: "/jugend?tag=treffen", icon: UsersRound, note: "Gehört zu Gruppen." },
          { label: "Sport", href: "/jugend?tag=sport", icon: HeartPulse, note: "Kann als Filter bleiben." },
        ],
      },
    ],
    feel: [
      "Der Modus fühlt sich bereits eigenständig an.",
      "Doppelte Karte ist hier weniger schlimm, weil Map-first zur Zielgruppe passt.",
      "Wichtig ist, dass es nicht nach Hausaufgabe aussieht.",
    ],
    decisions: [
      "Bottom-Nav für Jugend behalten.",
      "Missionen als starker Start, aber nicht trocken benennen.",
      "Filter bleiben leicht und spielerisch.",
    ],
  },
  einfach: {
    headline: "Heute: Einfach ist nah dran, weil es wirklich wenige Entscheidungen gibt.",
    bottomNav: [
      { label: "Kreis", href: "/mein-kreis", icon: UsersRound },
      { label: "Hier", href: "/hier-bei-mir", icon: Building2 },
      { label: "Schreiben", href: "/schreiben", icon: MessageCircle },
      { label: "SOS", href: "/sos", icon: AlertTriangle },
    ],
    topActions: [
      { label: "Mein Kreis", href: "/mein-kreis", icon: UsersRound, note: "Familie und vertraute Personen." },
      { label: "Hier bei mir", href: "/hier-bei-mir", icon: Building2, note: "Quartier sehr einfach formuliert." },
      { label: "Schreiben", href: "/schreiben", icon: MessageCircle, note: "Kommunikation ohne Inbox-Sprache." },
      { label: "Notfall", href: "/sos", icon: AlertTriangle, note: "Muss immer klar bleiben." },
    ],
    groups: [
      {
        title: "Mehr",
        subtitle: "Nur sekundär, nicht im Weg",
        tone: "slate",
        items: [
          { label: "Termine", href: "/mein-kreis/termine", icon: CalendarDays, note: "Sekundär." },
          { label: "Profil", href: "/profil", icon: User, note: "Sekundär." },
        ],
      },
    ],
    feel: [
      "Die vier großen Wege sind verständlich.",
      "Der Notfall darf nicht neben normalen roten Badges untergehen.",
      "Alles Sekundäre muss hinter 'Mehr' bleiben.",
    ],
    decisions: [
      "Einfach nicht mit Aktiv-Funktionen auffüllen.",
      "Vier Hauptkacheln behalten.",
      "112/110 vor allem anderen zeigen, wenn echte Notfallkategorie vorliegt.",
    ],
  },
};

const proposedStructures: Record<RoleId, Structure> = {
  aktiv: {
    headline: "Vorschlag: Die Quartiergemeinschaft wird der erste Produktbereich.",
    bottomNav: [
      { label: "Start", href: "/dashboard", icon: Home },
      { label: "Quartier", href: "/quartier-info", icon: Building2 },
      { label: "Hilfe", href: "/hilfe", icon: Heart },
      { label: "Ich", href: "/profile", icon: User },
    ],
    topActions: [
      { label: "Nachbar hinzufügen", href: "/kontakte/neu", icon: UserPlus, note: "Der wichtigste Wachstumsweg: vertraute Menschen direkt in die App holen." },
      { label: "App empfehlen", href: "/invitations", icon: Share2, note: "Ein persönlicher Empfehlungslink statt kalter Werbung." },
      { label: "Heute im Quartier", href: "/news", icon: Newspaper, note: "News, Rathaus und Hinweise zusammen." },
      { label: "Hilfe anbieten", href: "/hilfe", icon: Heart, note: "Aktiv soll helfen können." },
    ],
    groups: [
      {
        title: "Gemeinschaft",
        subtitle: "Nachbarn, Empfehlungen, Generationen, Vertrauen",
        tone: "green",
        items: [
          { label: "Nachbar hinzufügen", href: "/kontakte/neu", icon: UserPlus, note: "Kontakt einladen, Haushalt bestätigen, Beziehung aufbauen." },
          { label: "App empfehlen", href: "/invitations", icon: Share2, note: "Teilen per Link, QR oder persönlicher Einladung." },
          { label: "Gemeinsam helfen", href: "/hilfe", icon: Heart, note: "Motiviert, weil der eigene Kreis sichtbar wächst." },
        ],
      },
      {
        title: "Quartier",
        subtitle: "Karte, News, Rathaus, Müll, Mängel",
        tone: "blue",
        items: [
          { label: "Karte", href: "/map", icon: Map, note: "Einmaliger Quartier-Ort." },
          { label: "Rathaus", href: "/city-services", icon: Building2, note: "Kommunale Dienste." },
          { label: "Neuigkeiten", href: "/news", icon: Newspaper, note: "Lokale Infos." },
        ],
      },
      {
        title: "Hilfe",
        subtitle: "Suchen, anbieten, Einsätze, Einkauf",
        tone: "blue",
        items: [
          { label: "Hilfe suchen", href: "/hilfe", icon: Heart, note: "Bedarf erfassen." },
          { label: "Einsätze", href: "/hilfe/tasks", icon: ClipboardList, note: "Für aktive Helfer." },
          { label: "Einkauf", href: "/care/shopping", icon: ShoppingBag, note: "Als Hilfe-Aufgabe sichtbar." },
        ],
      },
      {
        title: "Teilen",
        subtitle: "Markt, Leihen, Wer hat, Pakete, Fundbüro",
        tone: "amber",
        items: [
          { label: "Marktplatz", href: "/marketplace", icon: ShoppingBag, note: "Kaufen/Abgeben." },
          { label: "Leihen", href: "/leihboerse", icon: Repeat2, note: "Ausleihen." },
          { label: "Gefunden", href: "/lost-found", icon: Search, note: "Suchen/Finden." },
        ],
      },
      {
        title: "Gesundheit",
        subtitle: "Nicht Haupttab, aber sauber auffindbar",
        tone: "rose",
        items: [
          { label: "Pflegegrad", href: "/pflegegrad-navigator", icon: ShieldCheck, note: "Bei Bedarf." },
          { label: "Vorsorge", href: "/praevention", icon: HeartPulse, note: "Sekundär." },
        ],
      },
    ],
    feel: [
      "Die App fühlt sich zuerst nach Nachbarschaft an, nicht nach Verwaltung.",
      "Wachstum passiert über Vertrauen: Nachbar hinzufügen, empfehlen, gemeinsam helfen.",
      "Funktionen sind wichtig, aber sie hängen sichtbar an Menschen im Quartier.",
    ],
    decisions: [
      "Start muss sofort Gemeinschaft zeigen: Wer ist da, wen kann ich einladen, was passiert in der Nähe?",
      "Gesundheit bleibt erreichbar, aber nicht als Aktiv-Haupttab.",
      "Empfehlung und Nachbar-hinzufügen werden eigene sichtbare Wachstumswege.",
    ],
  },
  komfort: {
    headline: "Vorschlag: Komfort bleibt ruhig und macht Pflegewege erwartbar.",
    bottomNav: [
      { label: "Start", href: "/dashboard", icon: Home },
      { label: "Status", href: "/care/status", icon: Heart },
      { label: "Gesundheit", href: "/care", icon: HeartPulse },
      { label: "Ich", href: "/profile", icon: User },
    ],
    topActions: [
      { label: "Alles okay?", href: "/care/status", icon: CheckCircle2, note: "Ein ruhiger Tagesanker." },
      { label: "Nachbar einladen", href: "/kontakte/neu", icon: UserPlus, note: "Für Komfort langsam und vertrauensvoll: bekannte Person hinzufügen." },
      { label: "Termine", href: "/care/termine", icon: CalendarDays, note: "Schnell erreichbar." },
      { label: "Mein Kreis", href: "/mein-kreis", icon: UsersRound, note: "Familie, Pflegekontakt und vertraute Nachbarn." },
    ],
    groups: [
      {
        title: "Mein Kreis",
        subtitle: "Familie, Nachbarn, vertraute Helfer",
        tone: "green",
        items: [
          { label: "Nachbar hinzufügen", href: "/kontakte/neu", icon: UserPlus, note: "Wen kenne ich wirklich im Haus oder in der Straße?" },
          { label: "Empfehlen", href: "/invitations", icon: Share2, note: "Einladung mit ruhiger, klarer Sprache." },
          { label: "Vertrauen", href: "/kontakte", icon: ShieldCheck, note: "Kontakte sind nicht anonym, sondern bestätigt." },
        ],
      },
      {
        title: "Status & Alltag",
        subtitle: "Check-in, Tagesüberblick, Kontakte",
        tone: "blue",
        items: [
          { label: "Check-in", href: "/care/checkin", icon: CheckCircle2, note: "Täglich." },
          { label: "Mein Tag", href: "/my-day", icon: CalendarDays, note: "Ruhiger Überblick." },
          { label: "Mein Kreis", href: "/mein-kreis", icon: UsersRound, note: "Vertraute Personen." },
        ],
      },
      {
        title: "Gesundheit",
        subtitle: "Medikamente, Ärzte, Termine, Vorsorge",
        tone: "rose",
        items: [
          { label: "Ärzte", href: "/care/aerzte", icon: Stethoscope, note: "Fachlich." },
          { label: "Termine", href: "/care/termine", icon: CalendarDays, note: "Planbar." },
          { label: "Vorsorge", href: "/praevention", icon: HeartPulse, note: "Ruhig formuliert." },
        ],
      },
      {
        title: "Quartier",
        subtitle: "Nur wichtige lokale Dinge",
        tone: "blue",
        items: [
          { label: "Rathaus", href: "/city-services", icon: Building2, note: "Sekundär." },
          { label: "Karte", href: "/map", icon: Map, note: "Bei Bedarf." },
        ],
      },
    ],
    feel: [
      "Weniger laut, stärker wie eine vertrauenswürdige Alltags-App.",
      "Pflege ist klar, aber eingebettet in echte Menschen.",
      "Das Wachstum wirkt nicht wie Marketing, sondern wie: Ich hole jemanden Vertrautes dazu.",
    ],
    decisions: [
      "Status und Gesundheit bleiben Hauptnavigation.",
      "Mein Kreis wird Familie plus Nachbarn, nicht nur Pflegekontakt.",
      "Kommunikationswege heißen nicht Inbox, sondern Kontakt/Kreis.",
    ],
  },
  jugend: {
    headline: "Vorschlag: Jugend bleibt schnell, visuell und eigenständig.",
    bottomNav: [
      { label: "Start", href: "/jugend", icon: Home },
      { label: "Karte", href: "/map", icon: Map },
      { label: "Tauschen", href: "/jugend/tauschen", icon: Repeat2 },
      { label: "Gruppen", href: "/jugend/gruppen", icon: UsersRound },
    ],
    topActions: [
      { label: "Freund einladen", href: "/jugend/freunde/einladen", icon: UserPlus, note: "Wachstum über echte Freundschaft, nicht über trockene Registrierung." },
      { label: "Was geht?", href: "/jugend/aufgaben", icon: ClipboardList, note: "Missionen ohne Projektarbeits-Gefühl." },
      { label: "In der Nähe", href: "/map", icon: Map, note: "Karte als Erlebnis." },
      { label: "Tauschen", href: "/jugend/tauschen", icon: Repeat2, note: "Direkt." },
    ],
    groups: [
      {
        title: "Live im Quartier",
        subtitle: "Karte, Spots, neue Dinge",
        tone: "blue",
        items: [
          { label: "Karte", href: "/map", icon: Map, note: "Hauptgefühl." },
          { label: "Events", href: "/events", icon: CalendarDays, note: "Aktuell." },
        ],
      },
      {
        title: "Machen",
        subtitle: "Missionen, Badges, Mithelfen",
        tone: "amber",
        items: [
          { label: "Missionen", href: "/jugend/aufgaben", icon: ClipboardList, note: "Spielerisch." },
          { label: "Badges", href: "/jugend/badges", icon: ShieldCheck, note: "Motivation." },
        ],
      },
      {
        title: "Community",
        subtitle: "Freunde, Gruppen, Tauschen, Empfehlung",
        tone: "green",
        items: [
          { label: "Freund einladen", href: "/jugend/freunde/einladen", icon: UserPlus, note: "Einladung mit Elternfreigabe, aber jugendlich formuliert." },
          { label: "Tauschen", href: "/jugend/tauschen", icon: Repeat2, note: "Geben/finden." },
          { label: "Gruppen", href: "/jugend/gruppen", icon: UsersRound, note: "Dranbleiben." },
          { label: "Quartier-Bonus", href: "/jugend/badges", icon: Trophy, note: "Motivation für Mitmachen und sinnvolles Empfehlen." },
        ],
      },
    ],
    feel: [
      "Mehr App 2026, weniger Arbeitsblatt.",
      "Karte, Freunde und Gruppen sind die Hauptenergie.",
      "Die Begriffe müssen lebendig bleiben.",
    ],
    decisions: [
      "Bottom-Nav unverändert lassen.",
      "Freund-einladen wird sichtbar, aber mit Freigabe und Schutz.",
      "Keine trockenen Verwaltungswörter im Jugendmodus.",
    ],
  },
  einfach: {
    headline: "Vorschlag: Einfach bleibt radikal reduziert.",
    bottomNav: [
      { label: "Kreis", href: "/mein-kreis", icon: UsersRound },
      { label: "Hier", href: "/hier-bei-mir", icon: Building2 },
      { label: "Schreiben", href: "/schreiben", icon: MessageCircle },
      { label: "Notfall", href: "/sos", icon: AlertTriangle },
    ],
    topActions: [
      { label: "Mein Kreis", href: "/mein-kreis", icon: UsersRound, note: "Wer ist für mich da?" },
      { label: "Nachbar dazu", href: "/kontakte/neu", icon: UserPlus, note: "Sehr einfache Einladung: Person, Telefon, bestätigen." },
      { label: "Hier bei mir", href: "/hier-bei-mir", icon: Building2, note: "Was ist in meiner Nähe?" },
      { label: "Schreiben", href: "/schreiben", icon: MessageCircle, note: "Eine einfache Nachricht." },
    ],
    groups: [
      {
        title: "Menschen",
        subtitle: "Mein Kreis und vertraute Nachbarn",
        tone: "green",
        items: [
          { label: "Mein Kreis", href: "/mein-kreis", icon: UsersRound, note: "Familie und vertraute Nachbarn an einem Ort." },
          { label: "Nachbar dazu", href: "/kontakte/neu", icon: UserPlus, note: "Einladungsweg muss maximal einfach bleiben." },
        ],
      },
      {
        title: "Mehr",
        subtitle: "Nur wenn bewusst geöffnet",
        tone: "slate",
        items: [
          { label: "Termine", href: "/mein-kreis/termine", icon: CalendarDays, note: "Nicht im Weg." },
          { label: "Profil", href: "/profil", icon: User, note: "Technisch nötig, visuell leise." },
        ],
      },
    ],
    feel: [
      "Das fühlt sich wie ein Gerät für Sicherheit an, nicht wie ein Portal.",
      "Menschen stehen vor Funktionen: Kreis, Nachbar, Schreiben.",
      "Notfall ist eigener großer Weg, nicht nur ein Icon.",
    ],
    decisions: [
      "Einfach bleibt eigene Startlogik, nicht verkleinerte Aktiv-UI.",
      "Nachbar hinzufügen darf erscheinen, aber nur als sehr einfache geführte Aktion.",
      "Sekundäres hinter Mehr lassen.",
    ],
  },
};

const structures: Record<VariantId, Record<RoleId, Structure>> = {
  current: currentStructures,
  proposed: proposedStructures,
};

const duplicationNotes = [
  {
    title: "Nachrichten",
    body: "Die Start-Kachel und die Glocke erfüllen denselben Zweck. Eine Glocke reicht.",
  },
  {
    title: "Karte",
    body: "Karte taucht als Tab, Kachel und Profilweg auf. Bei Aktiv in Quartier bündeln, bei Jugend bewusst prominent lassen.",
  },
  {
    title: "Markt / Leihen / Wer hat",
    body: "Das sind Varianten derselben Nutzerfrage: 'Kann ich etwas bekommen oder abgeben?'",
  },
  {
    title: "Rathaus / News / Quartier",
    body: "Für Nutzer ist das ein Bereich: Was betrifft mich hier vor Ort?",
  },
];

const communityGrowthNotes = [
  {
    title: "Primärer Loop",
    body: "Ein Nutzer erlebt Nutzen, fügt einen echten Nachbarn hinzu, beide sehen mehr Quartierleben und empfehlen weiter.",
  },
  {
    title: "Motivatoren",
    body: "Vertrauen, konkrete Hilfe, lokale Sichtbarkeit, kleine Anerkennung und das Gefühl: Meine Straße wird lebendiger.",
  },
  {
    title: "Nicht als Werbung",
    body: "Empfehlungen sollten persönlich wirken: 'Ich lade Sie in unsere QuartierApp ein', nicht wie ein Promo-Code.",
  },
];

function getEntryKey(entry: MenuEntry) {
  return `${entry.href}:${entry.label}`;
}

export function MenuStructurePreviewClient() {
  const [role, setRole] = useState<RoleId>("aktiv");
  const [variant, setVariant] = useState<VariantId>("proposed");
  const [activeEntry, setActiveEntry] = useState<string | null>(null);

  const structure = structures[variant][role];
  const selectedEntry = useMemo(() => {
    const entries = [...structure.topActions, ...structure.groups.flatMap((group) => group.items)];
    return entries.find((entry) => getEntryKey(entry) === activeEntry) ?? structure.topActions[0];
  }, [activeEntry, structure]);

  return (
    <main className="min-h-screen bg-[#f4f6f4] text-[#2D3142]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4CAF87]">
              Lokale Menü-Fühlprobe
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#2D3142] sm:text-4xl">
              So würde sich die QuartierApp-Navigation anfühlen
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Umschalten, klicken, vergleichen: heutige Struktur gegen den
              klareren Vorschlag für Aktiv, Komfort, Jugend und Einfach.
            </p>
          </div>

          <div className="grid gap-3 sm:min-w-[360px]">
            <SegmentedControl
              label="Ansicht"
              value={variant}
              options={[
                { value: "proposed", label: "Vorschlag" },
                { value: "current", label: "Heute" },
              ]}
              onChange={(value) => {
                setVariant(value);
                setActiveEntry(null);
              }}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {roles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRole(item.id);
                    setActiveEntry(null);
                  }}
                  className={`min-h-12 rounded-[8px] border px-3 py-2 text-sm font-semibold transition ${
                    role === item.id
                      ? "border-[#2D3142] bg-[#2D3142] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#4CAF87]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(360px,440px)_1fr]">
          <PhonePreview
            role={role}
            variant={variant}
            structure={structure}
            selectedEntry={selectedEntry}
            activeEntry={activeEntry}
            onSelectEntry={setActiveEntry}
          />

          <div className="grid gap-5">
            <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#2D3142]">
                    {roles.find((item) => item.id === role)?.label}: Eindruck
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    {roles.find((item) => item.id === role)?.description}
                  </p>
                </div>
                <span className="w-fit rounded-[8px] border border-[#4CAF87]/30 bg-[#4CAF87]/10 px-3 py-2 text-sm font-semibold text-[#1f5f4b]">
                  {variant === "proposed" ? "Zielstruktur" : "Bestand"}
                </span>
              </div>

              <p className="mt-5 text-lg font-semibold leading-7 text-[#2D3142]">
                {structure.headline}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {structure.feel.map((item) => (
                  <div
                    key={item}
                    className="rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2D3142]">
                Was wir daraus bauen würden
              </h2>
              <div className="mt-4 grid gap-3">
                {structure.decisions.map((item) => (
                  <div key={item} className="flex gap-3 rounded-[8px] bg-slate-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#4CAF87]" />
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[8px] border border-[#4CAF87]/30 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2D3142]">
                Wachstumslogik der Quartiergemeinschaft
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {communityGrowthNotes.map((note) => (
                  <article
                    key={note.title}
                    className="rounded-[8px] border border-[#4CAF87]/25 bg-[#4CAF87]/10 p-4"
                  >
                    <h3 className="font-semibold text-[#1f5f4b]">{note.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#1f5f4b]/80">
                      {note.body}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2D3142]">
                Auffällige Dopplungen
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {duplicationNotes.map((note) => (
                  <article
                    key={note.title}
                    className="rounded-[8px] border border-amber-200 bg-amber-50 p-4"
                  >
                    <h3 className="font-semibold text-amber-900">{note.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-amber-900/80">
                      {note.body}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="grid grid-cols-2 rounded-[8px] border border-slate-200 bg-slate-100 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-[6px] px-4 text-sm font-semibold transition ${
              value === option.value
                ? "bg-white text-[#2D3142] shadow-sm"
                : "text-slate-600 hover:text-[#2D3142]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhonePreview({
  role,
  variant,
  structure,
  selectedEntry,
  activeEntry,
  onSelectEntry,
}: {
  role: RoleId;
  variant: VariantId;
  structure: Structure;
  selectedEntry: MenuEntry;
  activeEntry: string | null;
  onSelectEntry: (key: string) => void;
}) {
  const isSimple = role === "einfach";

  return (
    <aside className="rounded-[28px] border border-slate-300 bg-[#1f2430] p-3 shadow-2xl">
      <div className="overflow-hidden rounded-[22px] bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              QuartierApp
            </p>
            <h2 className="text-lg font-semibold text-[#2D3142]">
              {role === "jugend" ? "Was geht?" : role === "einfach" ? "Guten Tag" : "Start"}
            </h2>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Benachrichtigungen"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-[620px] bg-[#f8faf8] px-4 py-5">
          <div className="rounded-[8px] border border-[#4CAF87]/25 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#4CAF87]">
              {variant === "proposed" ? "Vorschlag" : "Heute"}
            </p>
            <p className="mt-2 text-xl font-semibold leading-7 text-[#2D3142]">
              {structure.headline}
            </p>
          </div>

          {isSimple ? (
            <div className="mt-4 grid gap-3">
              {structure.topActions.map((entry) => (
                <EntryButton
                  key={getEntryKey(entry)}
                  entry={entry}
                  active={getEntryKey(entry) === activeEntry}
                  large
                  onClick={() => onSelectEntry(getEntryKey(entry))}
                />
              ))}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {structure.topActions.map((entry) => (
                  <EntryButton
                    key={getEntryKey(entry)}
                    entry={entry}
                    active={getEntryKey(entry) === activeEntry}
                    onClick={() => onSelectEntry(getEntryKey(entry))}
                  />
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                {structure.groups.map((group) => (
                  <section
                    key={group.title}
                    className={`rounded-[8px] border p-4 ${toneClasses[group.tone]}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{group.title}</h3>
                        <p className="mt-1 text-sm opacity-80">{group.subtitle}</p>
                      </div>
                      <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold">
                        {group.items.length}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {group.items.map((entry) => (
                        <button
                          key={getEntryKey(entry)}
                          type="button"
                          onClick={() => onSelectEntry(getEntryKey(entry))}
                          className="flex min-h-12 items-center gap-3 rounded-[8px] bg-white/75 px-3 py-2 text-left text-sm font-semibold shadow-sm transition hover:bg-white"
                        >
                          <entry.icon className="h-4 w-4 shrink-0" />
                          <span>{entry.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Angeklickt
            </p>
            <div className="mt-3 flex items-start gap-3">
              <selectedEntry.icon className="mt-1 h-5 w-5 shrink-0 text-[#4CAF87]" />
              <div>
                <p className="font-semibold text-[#2D3142]">{selectedEntry.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedEntry.note}
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {selectedEntry.href}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2">
          {structure.bottomNav.map((item, index) => (
            <button
              key={item.href}
              type="button"
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-[8px] text-xs font-semibold ${
                index === 0
                  ? "bg-[#4CAF87]/10 text-[#1f5f4b]"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function EntryButton({
  entry,
  active,
  large = false,
  onClick,
}: {
  entry: MenuEntry;
  active: boolean;
  large?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[8px] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        large ? "min-h-24" : "min-h-20"
      } ${
        active
          ? "border-[#4CAF87] ring-2 ring-[#4CAF87]/25"
          : "border-slate-200"
      }`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[#4CAF87]/10 text-[#1f5f4b]">
        <entry.icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold text-[#2D3142]">{entry.label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {entry.href}
        </span>
      </span>
    </button>
  );
}
