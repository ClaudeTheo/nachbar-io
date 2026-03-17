// Nachbar.io — Quartier-Konfiguration und Konstanten
//
// ============================================================================
// MIGRATION HINWEIS: Multi-Quartier-Expansion
// ============================================================================
// Die folgenden PILOT_*-Konstanten sind Fallback-Werte fuer das Pilotquartier
// Bad Saeckingen. In neuen Komponenten sollte stattdessen `useQuarter()` aus
// `@/lib/quarters` verwendet werden, um die Quartiersdaten dynamisch aus der
// Datenbank zu laden.
//
// Die alten Namen (QUARTIER_CENTER, QUARTIER_STREETS etc.) werden als
// Aliase re-exportiert, damit bestehender Code weiterhin funktioniert.
// Sie sollten schrittweise durch useQuarter() ersetzt werden.
// ============================================================================

// --- Pilot-Quartier Bad Saeckingen: Fallback-Konstanten ---

// Geo-Zentrum des Pilotquartiers Bad Saeckingen
// Basierend auf realer Karte: Purkersdorfer Str. / Sanarystraße / Oberer Rebberg
// Mitte des Quartiers: 47°33'42.1"N, 7°56'53.7"E
// @deprecated Verwende useQuarter().center aus @/lib/quarters
export const PILOT_QUARTIER_CENTER = {
  lat: 47.5617,
  lng: 7.9483,
} as const;

// @deprecated Verwende useQuarter().zoom aus @/lib/quarters
export const PILOT_QUARTIER_ZOOM = 17;

// GeoJSON-Bounding-Box fuer das Pilotquartier
// @deprecated Verwende useQuarter().bounds aus @/lib/quarters
export const PILOT_QUARTIER_BOUNDS = {
  type: "Polygon" as const,
  coordinates: [
    [
      [7.945, 47.559],
      [7.952, 47.559],
      [7.952, 47.565],
      [7.945, 47.565],
      [7.945, 47.559],
    ],
  ],
};

// Straßen des Pilotquartiers
// @deprecated Verwende useQuarter().streets aus @/lib/quarters
export const PILOT_QUARTIER_STREETS = [
  "Purkersdorfer Straße",
  "Sanarystraße",
  "Oberer Rebberg",
] as const;

// --- Abwaertskompatible Aliase (schrittweise durch useQuarter() ersetzen) ---

/** @deprecated Verwende PILOT_QUARTIER_CENTER oder useQuarter().center */
export const QUARTIER_CENTER = PILOT_QUARTIER_CENTER;

/** @deprecated Verwende PILOT_QUARTIER_ZOOM oder useQuarter().zoom */
export const QUARTIER_ZOOM = PILOT_QUARTIER_ZOOM;

/** @deprecated Verwende PILOT_QUARTIER_BOUNDS oder useQuarter().bounds */
export const QUARTIER_BOUNDS = PILOT_QUARTIER_BOUNDS;

/** @deprecated Verwende PILOT_QUARTIER_STREETS oder useQuarter().streets */
export const QUARTIER_STREETS = PILOT_QUARTIER_STREETS;

export type QuartierStreet = (typeof PILOT_QUARTIER_STREETS)[number];

// Alert-Kategorien
export const ALERT_CATEGORIES = [
  // Dringende Kategorien (loesen Hinweis-Banner aus — 112/110 zuerst!)
  { id: "fire", label: "Feuer / Rauch", icon: "🔥", urgency: "emergency" },
  { id: "health_concern", label: "Gesundheitliche Sorge", icon: "🚑", urgency: "emergency" },
  { id: "crime", label: "Einbruch / Bedrohung", icon: "🚨", urgency: "emergency" },
  // Dringende Kategorien
  { id: "water_damage", label: "Wasserschaden", icon: "💧", urgency: "high" },
  { id: "power_outage", label: "Stromausfall", icon: "⚡", urgency: "high" },
  { id: "fall", label: "Sturz", icon: "🩹", urgency: "high" },
  // Mittlere Dringlichkeit
  { id: "door_lock", label: "Tür zu / Schlüssel", icon: "🔑", urgency: "medium" },
  { id: "pet", label: "Haustier entlaufen", icon: "🐾", urgency: "medium" },
  // Niedrige Dringlichkeit
  { id: "shopping", label: "Einkaufshilfe", icon: "🛒", urgency: "low" },
  { id: "tech_help", label: "Technische Hilfe", icon: "💻", urgency: "low" },
  { id: "other", label: "Sonstiges", icon: "❓", urgency: "low" },
] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number]["id"];

// Notfall-Kategorien die den Emergency-Banner auslösen
export const EMERGENCY_CATEGORIES = ["fire", "health_concern", "crime"] as const;

// Hilfe-Börse Kategorien
export const HELP_CATEGORIES = [
  { id: "garden", label: "Garten / Rasen", icon: "🌿" },
  { id: "shopping", label: "Einkaufen", icon: "🛒" },
  { id: "transport", label: "Fahrdienst", icon: "🚗" },
  { id: "tech", label: "IT / Computer", icon: "💻" },
  { id: "childcare", label: "Kinderbetreuung", icon: "👶" },
  { id: "handwork", label: "Handwerk", icon: "🔧" },
  { id: "pet_care", label: "Tierbetreuung", icon: "🐾" },
  { id: "tutoring", label: "Nachhilfe", icon: "📚" },
  { id: "company", label: "Gesellschaft", icon: "☕" },
  { id: "package", label: "Paketannahme", icon: "📦" },
  { id: "other", label: "Sonstiges", icon: "❓" },
] as const;

// Hilfe-Unterkategorien (optional, nur fuer Kategorien mit sinnvollen Untergruppen)
export const HELP_SUBCATEGORIES: Record<string, readonly { id: string; label: string }[]> = {
  pet_care: [
    { id: "dog_walking", label: "Gassi gehen" },
    { id: "cat_feeding", label: "Katzen füttern" },
    { id: "pet_sitting", label: "Tiersitting" },
    { id: "vet_transport", label: "Tierarzt-Fahrt" },
  ],
  garden: [
    { id: "mowing", label: "Rasen mähen" },
    { id: "watering", label: "Gießen" },
    { id: "hedge_trimming", label: "Hecke schneiden" },
    { id: "planting", label: "Bepflanzung" },
  ],
  handwork: [
    { id: "plumbing", label: "Klempner / Sanitär" },
    { id: "painting", label: "Streichen / Tapezieren" },
    { id: "carpentry", label: "Schreinern / Holz" },
    { id: "assembly", label: "Möbel-Montage" },
  ],
  childcare: [
    { id: "pickup", label: "Abholen / Bringen" },
    { id: "play_date", label: "Spielnachmittag" },
    { id: "homework", label: "Hausaufgabenhilfe" },
  ],
  tech: [
    { id: "phone_help", label: "Handy-Hilfe" },
    { id: "pc_setup", label: "PC-Einrichtung" },
    { id: "internet", label: "Internet / WLAN" },
  ],
  shopping: [
    { id: "weekly", label: "Wocheneinkauf" },
    { id: "pharmacy", label: "Apotheke" },
    { id: "parcel", label: "Paket-Annahme" },
  ],
  transport: [
    { id: "doctor", label: "Arztfahrt" },
    { id: "official", label: "Behördengang" },
    { id: "moving", label: "Möbeltransport" },
  ],
} as const;

// Marktplatz-Typen
export const MARKETPLACE_TYPES = [
  { id: "sell", label: "Verkaufen", icon: "💰" },
  { id: "give", label: "Verschenken", icon: "🎁" },
  { id: "search", label: "Suchen", icon: "🔍" },
  { id: "lend", label: "Verleihen", icon: "🔄" },
] as const;

// Marktplatz-Kategorien
export const MARKETPLACE_CATEGORIES = [
  { id: "furniture", label: "Möbel & Einrichtung" },
  { id: "tools", label: "Werkzeug & Garten" },
  { id: "kids", label: "Kinderartikel" },
  { id: "books", label: "Bücher & Medien" },
  { id: "electronics", label: "Elektronik" },
  { id: "clothing", label: "Kleidung" },
  { id: "plants", label: "Pflanzen" },
  { id: "household", label: "Haushalt" },
  { id: "other", label: "Sonstiges" },
] as const;

// Skill-Kategorien
export const SKILL_CATEGORIES = [
  { id: "medical", label: "Medizin / Gesundheit", icon: "🏥" },
  { id: "legal", label: "Recht / Finanzen", icon: "⚖️" },
  { id: "electrical", label: "Elektrik", icon: "🔌" },
  { id: "it", label: "IT / Technik", icon: "💻" },
  { id: "garden", label: "Garten / Pflanzen", icon: "🌿" },
  { id: "handwork", label: "Handwerk", icon: "🔧" },
  { id: "transport", label: "Fahrdienst", icon: "🚗" },
  { id: "cooking", label: "Kochen / Backen", icon: "🍳" },
  { id: "music", label: "Musik / Kunst", icon: "🎵" },
  { id: "languages", label: "Sprachen", icon: "🌍" },
  { id: "childcare", label: "Kinderbetreuung", icon: "👶" },
  { id: "pet_care", label: "Tierbetreuung", icon: "🐾" },
  { id: "other", label: "Sonstiges", icon: "❓" },
] as const;

// Benachrichtigungs-Radius
export const NOTIFICATION_RADIUS = {
  1: { label: "Direkte Nachbarn", delayMinutes: 0, description: "±3 Hausnummern" },
  2: { label: "Gesamte Straße", delayMinutes: 10, description: "Alle Bewohner der Straße" },
  3: { label: "Ganzes Quartier", delayMinutes: 30, description: "Alle 3 Straßen" },
} as const;

// Anti-Spam-Limits
export const PUSH_LIMITS = {
  maxPerHour: 3,
  quietHoursStart: 22, // 22:00 Uhr
  quietHoursEnd: 7, // 07:00 Uhr
} as const;

// Event-Kategorien (Phase 2: Veranstaltungskalender)
export const EVENT_CATEGORIES = [
  { id: "community", label: "Nachbarschaftstreffen", icon: "🏘️" },
  { id: "sports", label: "Sport & Bewegung", icon: "⚽" },
  { id: "culture", label: "Kultur & Bildung", icon: "🎭" },
  { id: "market", label: "Flohmarkt & Tausch", icon: "🛍️" },
  { id: "kids", label: "Kinder & Familie", icon: "👨‍👩‍👧" },
  { id: "seniors", label: "Seniorentreff", icon: "☕" },
  { id: "cleanup", label: "Putzaktion & Garten", icon: "🧹" },
  { id: "other", label: "Sonstiges", icon: "📅" },
] as const;

// Experten-Kategorien (Untergruppe der Skill-Kategorien, die als Experten gesucht werden)
export const EXPERT_CATEGORIES = [
  { id: "electrical", label: "Elektriker", icon: "🔌", description: "Elektroinstallation & Reparaturen" },
  { id: "handwork", label: "Handwerk", icon: "🔧", description: "Sanitär, Schreiner, Maler & mehr" },
  { id: "it", label: "IT & Technik", icon: "💻", description: "Computer, Handy, Internet & Smart Home" },
  { id: "garden", label: "Garten & Pflanzen", icon: "🌿", description: "Rasenpflege, Bäume & Bepflanzung" },
  { id: "medical", label: "Medizin & Pflege", icon: "🏥", description: "Gesundheitsberatung & Pflege" },
  { id: "legal", label: "Recht & Finanzen", icon: "⚖️", description: "Rechtsberatung & Steuern" },
  { id: "cooking", label: "Kochen & Backen", icon: "🍳", description: "Catering & Kochkurse" },
  { id: "transport", label: "Fahrdienst", icon: "🚗", description: "Transporte & Umzugshilfe" },
  { id: "music", label: "Musik & Kunst", icon: "🎵", description: "Unterricht & Auftritte" },
  { id: "languages", label: "Sprachen", icon: "🌍", description: "Übersetzung & Sprachkurse" },
  { id: "childcare", label: "Kinderbetreuung", icon: "👶", description: "Babysitting & Nachhilfe" },
  { id: "pet_care", label: "Tierbetreuung", icon: "🐾", description: "Gassi gehen, Tiersitting" },
  { id: "other", label: "Sonstiges", icon: "❓", description: "Weitere Kompetenzen" },
] as const;

// Nachbarschafts-Tipps Kategorien (Empfehlungen, KEIN Social Media)
export const TIP_CATEGORIES = [
  { id: "craftsmen", label: "Handwerker & Betriebe", icon: "🔧" },
  { id: "gastro", label: "Restaurants & Cafés", icon: "☕" },
  { id: "health", label: "Ärzte & Gesundheit", icon: "🏥" },
  { id: "services", label: "Dienstleistungen", icon: "📋" },
  { id: "shopping", label: "Einkaufen & Läden", icon: "🛍️" },
  { id: "kids", label: "Kinder & Familie", icon: "👶" },
  { id: "mobility", label: "Mobilität & Verkehr", icon: "🚌" },
  { id: "official", label: "Behörden & Recht", icon: "⚖️" },
  { id: "nature", label: "Natur & Freizeit", icon: "🌳" },
  { id: "general", label: "Allgemein", icon: "💡" },
] as const;

export type TipCategory = (typeof TIP_CATEGORIES)[number]["id"];

// Leihboerse-Kategorien
export const LEIHBOERSE_CATEGORIES = [
  { id: "tools", label: "Werkzeug", icon: "🔧" },
  { id: "garden", label: "Garten", icon: "🌱" },
  { id: "kitchen", label: "Küche", icon: "🍳" },
  { id: "sports", label: "Sport", icon: "⚽" },
  { id: "kids", label: "Kinder", icon: "🧸" },
  { id: "electronics", label: "Elektronik", icon: "💻" },
  { id: "books", label: "Bücher", icon: "📚" },
  { id: "other", label: "Sonstiges", icon: "📦" },
] as const;

// Lärm-Warnung Kategorien
export const NOISE_CATEGORIES = [
  { id: "drilling", label: "Bohren / Hämmern", icon: "🔨" },
  { id: "party", label: "Feier / Musik", icon: "🎉" },
  { id: "renovation", label: "Renovierung", icon: "🏗️" },
  { id: "mowing", label: "Rasenmähen", icon: "🌿" },
  { id: "music", label: "Instrument üben", icon: "🎸" },
  { id: "construction", label: "Bauarbeiten", icon: "🚧" },
  { id: "other", label: "Sonstiges", icon: "🔊" },
] as const;

// Lärm-Warnung Dauer-Optionen (in Stunden)
export const NOISE_DURATIONS = [
  { id: "1", label: "~1 Stunde", hours: 1 },
  { id: "2", label: "~2 Stunden", hours: 2 },
  { id: "4", label: "~4 Stunden", hours: 4 },
  { id: "evening", label: "Bis heute Abend", hours: 6 },
  { id: "allday", label: "Den ganzen Tag", hours: 12 },
] as const;

// News-Kategorien (fuer Kategorie-Filter auf der News-Seite)
export const NEWS_CATEGORIES = [
  { id: "all", label: "Alle", icon: "📰" },
  { id: "infrastructure", label: "Infrastruktur", icon: "🚧" },
  { id: "events", label: "Veranstaltungen", icon: "🎭" },
  { id: "administration", label: "Verwaltung", icon: "🏛️" },
  { id: "weather", label: "Wetter", icon: "☀️" },
  { id: "waste", label: "Entsorgung", icon: "🗑️" },
  { id: "other", label: "Sonstiges", icon: "📰" },
] as const;

// Trust-Level
export const TRUST_LEVELS = {
  new: { label: "Registriert", color: "gray" },
  verified: { label: "Verifiziert", color: "green" },
  trusted: { label: "Vertraut", color: "blue" },
  admin: { label: "Admin", color: "purple" },
} as const;
