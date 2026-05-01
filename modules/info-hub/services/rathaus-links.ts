// Statische Rathaus-Links fuer Bad Saeckingen
import { normalizeBadSaeckingenLinks } from "@/lib/municipal";
import type { RathausLink } from "../types";

export const RATHAUS_LINKS: RathausLink[] = normalizeBadSaeckingenLinks([
  {
    label: "Mängelmelder",
    description: "Schäden und Mängel im Stadtgebiet melden",
    url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/maengelmeldung",
    icon: "alert-triangle",
  },
  {
    label: "Formulare & Anträge",
    description: "Behördliche Formulare und Online-Anträge",
    url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste",
    icon: "file-text",
  },
  {
    label: "Ratsinformationssystem",
    description: "Sitzungen, Beschlüsse und Tagesordnungen",
    url: "https://www.bad-saeckingen.de/rathaus-service/gemeinderat/ratsinfosystem",
    icon: "landmark",
  },
  {
    label: "Veranstaltungskalender",
    description: "Aktuelle Veranstaltungen in Bad Säckingen",
    url: "https://www.bad-saeckingen.de/leben-wohnen/veranstaltungen",
    icon: "calendar",
  },
  {
    label: "Stadtseniorenrat",
    description: "Anlaufstelle für ältere Bürgerinnen und Bürger",
    url: "https://www.bad-saeckingen.de/rathaus-service/gremien/seniorenrat",
    icon: "heart-handshake",
  },
  {
    label: "Pflegestützpunkt",
    description: "Beratung rund um Pflege und Unterstützung",
    url: "https://www.landkreis-waldshut.de/sozialamt/abteilungen/altenhilfe/pflegestuetzpunkt/",
    icon: "shield-check",
  },
]);
