// lib/feeds/ical-parser.ts
// Welle W10 — Generischer iCal/ICS-Parser fuer Event-Crawling.
//
// Konzeptueller Klon der Logik in modules/waste/services/ics-connector.ts
// (privat dort, Waste-spezifischer Output). Hier: generisch, exportiert,
// liefert IcalEvent[] mit ISO-Datums-Strings.

export interface IcalEvent {
  uid: string | null;
  summary: string;
  description: string | null;
  location: string | null;
  startDate: string; // YYYY-MM-DD oder ISO-8601
  endDate: string | null;
  isAllDay: boolean;
}

interface RawVEvent {
  uid: string | null;
  summary: string;
  description: string | null;
  location: string | null;
  dtstart: string;
  dtstartIsDate: boolean;
  dtend: string | null;
  dtendIsDate: boolean;
}

function unfoldLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const unfolded: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseProperty(line: string): { name: string; params: string; value: string } | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx <= 0) return null;
  const left = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const semiIdx = left.indexOf(";");
  const name = semiIdx >= 0 ? left.slice(0, semiIdx) : left;
  const params = semiIdx >= 0 ? left.slice(semiIdx + 1) : "";
  return { name: name.toUpperCase(), params, value };
}

function dtstartToIso(raw: string, isDate: boolean): string | null {
  const cleaned = raw.replace(/[^0-9TZ]/g, "");
  if (cleaned.length < 8) return null;

  const year = cleaned.slice(0, 4);
  const month = cleaned.slice(4, 6);
  const day = cleaned.slice(6, 8);

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (y < 2020 || y > 2040 || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const datePart = `${year}-${month}-${day}`;
  if (isDate || cleaned.length < 9) return datePart;

  // Zeit-Anteil: YYYYMMDDTHHmmss[Z]
  const timePart = cleaned.slice(9);
  const hour = timePart.slice(0, 2);
  const minute = timePart.slice(2, 4);
  const second = timePart.slice(4, 6) || "00";
  const isUtc = cleaned.endsWith("Z");

  const isoCandidate = `${datePart}T${hour}:${minute}:${second}${isUtc ? "Z" : ""}`;
  const dt = new Date(isoCandidate);
  if (Number.isNaN(dt.getTime())) return datePart;
  return dt.toISOString();
}

export function parseIcalFeed(text: string): IcalEvent[] {
  if (!text || typeof text !== "string") return [];
  if (!text.includes("BEGIN:VCALENDAR")) return [];

  const lines = unfoldLines(text);
  const raws: RawVEvent[] = [];
  let inEvent = false;
  let current: RawVEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {
        uid: null,
        summary: "",
        description: null,
        location: null,
        dtstart: "",
        dtstartIsDate: false,
        dtend: null,
        dtendIsDate: false,
      };
      continue;
    }

    if (line === "END:VEVENT") {
      if (inEvent && current && current.dtstart && current.summary) {
        raws.push(current);
      }
      inEvent = false;
      current = null;
      continue;
    }

    if (!inEvent || !current) continue;

    const prop = parseProperty(line);
    if (!prop) continue;

    switch (prop.name) {
      case "UID":
        current.uid = prop.value.trim() || null;
        break;
      case "SUMMARY":
        current.summary = prop.value.trim();
        break;
      case "DESCRIPTION":
        current.description = prop.value.trim() || null;
        break;
      case "LOCATION":
        current.location = prop.value.trim() || null;
        break;
      case "DTSTART":
        current.dtstart = prop.value.trim();
        current.dtstartIsDate = /VALUE=DATE\b/i.test(prop.params);
        break;
      case "DTEND":
        current.dtend = prop.value.trim();
        current.dtendIsDate = /VALUE=DATE\b/i.test(prop.params);
        break;
      default:
        break;
    }
  }

  return raws
    .map((r) => {
      const startIso = dtstartToIso(r.dtstart, r.dtstartIsDate);
      if (!startIso) return null;
      const endIso = r.dtend ? dtstartToIso(r.dtend, r.dtendIsDate) : null;
      return {
        uid: r.uid,
        summary: r.summary,
        description: r.description,
        location: r.location,
        startDate: startIso,
        endDate: endIso,
        isAllDay: r.dtstartIsDate,
      } satisfies IcalEvent;
    })
    .filter((e): e is IcalEvent => e !== null);
}
