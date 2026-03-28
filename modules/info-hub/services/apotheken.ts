// Statische Apotheken-Daten fuer Bad Säckingen (Pilot)
import type { Apotheke } from "../types";

export const APOTHEKEN_BAD_SAECKINGEN: Apotheke[] = [
  {
    name: "Schwarzwald-Apotheke",
    address: "Schützenstraße 16/1, 79713 Bad Säckingen",
    phone: "07761 553550",
    openingHours: "Mo-Fr 8:00-18:30, Sa 8:30-13:00",
  },
  {
    name: "Bergsee-Apotheke",
    address: "Bahnhofplatz 1, 79713 Bad Säckingen",
    phone: "07761 7486",
    openingHours: "Mo-Fr 8:00-18:30, Sa 8:00-12:30",
  },
  {
    name: "Loewen-Apotheke",
    address: "Laufenburger Straße 2, 79713 Bad Säckingen",
    phone: "07761 2355",
    openingHours: "Mo-Fr 8:00-18:30, Sa 8:30-12:30",
  },
];

export const NOTDIENST_URL =
  "https://www.aponet.de/apotheke/notdienstsuche/79713+Bad+S%C3%A4ckingen";
