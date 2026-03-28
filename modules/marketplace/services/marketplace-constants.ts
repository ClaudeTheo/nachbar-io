// Marktplatz-Konstanten: Typen und Kategorien fuer Inserate

export const MARKETPLACE_TYPES = [
  { id: "sell", label: "Verkaufen", icon: "💰" },
  { id: "give", label: "Verschenken", icon: "🎁" },
  { id: "search", label: "Suchen", icon: "🔍" },
  { id: "lend", label: "Verleihen", icon: "🔄" },
] as const;

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
