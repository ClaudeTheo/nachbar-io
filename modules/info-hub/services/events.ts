// Statische Veranstaltungen fuer Bad Säckingen (Pilot)
import type { LocalEvent } from "../types";

export const EVENTS_BAD_SAECKINGEN: LocalEvent[] = [
  {
    title: "Wochenmarkt",
    description: "Frische regionale Produkte auf dem Münsterplatz",
    schedule: "Jeden Samstag, 08:00–12:00 Uhr",
    location: "Münsterplatz",
    icon: "shopping-bag",
  },
  {
    title: "Wochenmarkt",
    description: "Kleinerer Markt unter der Woche",
    schedule: "Jeden Mittwoch, 08:00–12:00 Uhr",
    location: "Schützenstraße",
    icon: "shopping-bag",
  },
];

export const EVENTS_CALENDAR_URL =
  "https://www.badsaeckingen.de/kultur-events/veranstaltungskalender";
