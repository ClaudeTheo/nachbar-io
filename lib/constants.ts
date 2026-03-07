// Nachbar.io — Quartier-Konfiguration und Konstanten

// Geo-Zentrum des Quartiers Bad Säckingen
// Basierend auf realer Karte: Purkersdorfer Str. / Sanarystraße / Oberer Rebberg
// Mitte des Quartiers: 47°33'42.1"N, 7°56'53.7"E
export const QUARTIER_CENTER = {
  lat: 47.5617,
  lng: 7.9483,
} as const;

export const QUARTIER_ZOOM = 17;

// GeoJSON-Bounding-Box für das Quartier
export const QUARTIER_BOUNDS = {
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

// Straßen des Quartiers
export const QUARTIER_STREETS = [
  "Purkersdorfer Straße",
  "Sanarystraße",
  "Oberer Rebberg",
] as const;

export type QuartierStreet = (typeof QUARTIER_STREETS)[number];

// Alert-Kategorien
export const ALERT_CATEGORIES = [
  { id: "water_damage", label: "Wasserschaden", icon: "💧", urgency: "high" },
  { id: "power_outage", label: "Stromausfall", icon: "⚡", urgency: "high" },
  { id: "door_lock", label: "Tür zu / Schlüssel", icon: "🔑", urgency: "medium" },
  { id: "fall", label: "Sturz", icon: "🩹", urgency: "high" },
  { id: "shopping", label: "Einkaufshilfe", icon: "🛒", urgency: "low" },
  { id: "tech_help", label: "Technische Hilfe", icon: "💻", urgency: "low" },
  { id: "pet", label: "Haustier entlaufen", icon: "🐾", urgency: "medium" },
  { id: "other", label: "Sonstiges", icon: "❓", urgency: "low" },
] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number]["id"];

// Notfall-Kategorien die den Emergency-Banner auslösen
export const EMERGENCY_CATEGORIES = ["fire", "medical", "crime"] as const;

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
  { id: "other", label: "Sonstiges", icon: "❓" },
] as const;

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

// Trust-Level
export const TRUST_LEVELS = {
  new: { label: "Registriert", color: "gray" },
  verified: { label: "Verifiziert", color: "green" },
  trusted: { label: "Vertraut", color: "blue" },
  admin: { label: "Admin", color: "purple" },
} as const;
