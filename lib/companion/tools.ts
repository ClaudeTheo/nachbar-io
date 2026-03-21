// Nachbar.io — Companion Tool-Definitionen (11 Claude Tool Use Tools)
// Format: Anthropic Tool Use API (name, description, input_schema)

/** Einzelne Tool-Definition im Anthropic-Format */
export interface CompanionToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Hilfsangebote-Kategorien (auch fuer help_request)
const HELP_CATEGORIES = [
  'transport', 'shopping', 'companionship', 'garden',
  'tech_help', 'pet_care', 'household', 'other',
] as const;

// Erlaubte Routen fuer navigate_to
const ALLOWED_ROUTES = [
  '/dashboard', '/alerts', '/alerts/new', '/board', '/marketplace',
  '/marketplace/new', '/events', '/events/new', '/help', '/help/new',
  '/waste-calendar', '/map', '/profile', '/messages', '/experts',
  '/settings', '/amtsblatt', '/mitessen', '/mitessen/neu',
] as const;

/**
 * Alle 11 Companion-Tools im Anthropic Tool Use Format.
 * Write-Tools (1-8) benoetigen Nutzer-Bestaetigung.
 * Read-Tools (9-11) werden sofort ausgefuehrt.
 */
export const companionTools: CompanionToolDefinition[] = [
  // ── Write-Tools (benoetigen Bestaetigung) ──────────────────────

  {
    name: 'create_bulletin_post',
    description: 'Erstellt einen neuen Beitrag auf dem Schwarzen Brett des Quartiers.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel des Beitrags' },
        text: { type: 'string', description: 'Inhalt des Beitrags' },
        category: {
          type: 'string',
          enum: ['info', 'help', 'event', 'offer', 'other'],
          description: 'Kategorie des Beitrags',
        },
      },
      required: ['title', 'text'],
    },
  },

  {
    name: 'create_help_request',
    description: 'Erstellt eine neue Hilfsanfrage im Quartier (z.B. Einkaufshilfe, Fahrdienst).',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [...HELP_CATEGORIES],
          description: 'Art der benoetigten Hilfe',
        },
        title: { type: 'string', description: 'Kurzbeschreibung der Hilfsanfrage' },
        description: { type: 'string', description: 'Detaillierte Beschreibung' },
      },
      required: ['category', 'title'],
    },
  },

  {
    name: 'create_event',
    description: 'Erstellt eine neue Veranstaltung im Quartier-Kalender.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Name der Veranstaltung' },
        date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
        time: { type: 'string', description: 'Uhrzeit im Format HH:MM' },
        location: { type: 'string', description: 'Veranstaltungsort (optional)' },
        description: { type: 'string', description: 'Beschreibung der Veranstaltung (optional)' },
      },
      required: ['title', 'date', 'time'],
    },
  },

  {
    name: 'report_issue',
    description: 'Meldet ein Problem oder einen Mangel im Quartier (z.B. kaputte Strassenlaterne).',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Beschreibung des Problems' },
        location: { type: 'string', description: 'Ort des Problems (optional)' },
      },
      required: ['description'],
    },
  },

  {
    name: 'create_marketplace_listing',
    description: 'Erstellt ein neues Inserat auf dem Quartier-Marktplatz (Angebot, Gesuch oder Verschenken).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel des Inserats' },
        description: { type: 'string', description: 'Beschreibung (optional)' },
        price: { type: 'number', description: 'Preis in Euro (optional, 0 = kostenlos)' },
        type: {
          type: 'string',
          enum: ['offer', 'request', 'free'],
          description: 'Art des Inserats: Angebot, Gesuch oder Verschenken',
        },
      },
      required: ['title', 'type'],
    },
  },

  {
    name: 'update_help_offers',
    description: 'Aktualisiert die Hilfsangebote des Nutzers (welche Hilfe er/sie anbieten kann).',
    input_schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'string',
            enum: [...HELP_CATEGORIES],
          },
          description: 'Liste der angebotenen Hilfe-Kategorien',
        },
      },
      required: ['categories'],
    },
  },

  {
    name: 'send_message',
    description: 'Sendet eine Nachricht an einen anderen Bewohner im Quartier.',
    input_schema: {
      type: 'object',
      properties: {
        recipient_name: { type: 'string', description: 'Name des Empfaengers' },
        text: { type: 'string', description: 'Nachrichtentext' },
      },
      required: ['recipient_name', 'text'],
    },
  },

  {
    name: 'update_profile',
    description: 'Aktualisiert das Profil des Nutzers (Anzeigename und/oder Biografie).',
    input_schema: {
      type: 'object',
      properties: {
        display_name: { type: 'string', description: 'Neuer Anzeigename (optional)' },
        bio: { type: 'string', description: 'Neue Biografie (optional)' },
      },
    },
  },

  // ── Read-Tools (sofortige Ausfuehrung) ─────────────────────────

  {
    name: 'get_waste_dates',
    description: 'Zeigt die naechsten Muellabfuhr-Termine im Quartier an.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'get_upcoming_events',
    description: 'Zeigt die naechsten Veranstaltungen im Quartier an.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'navigate_to',
    description: 'Navigiert den Nutzer zu einer bestimmten Seite in der App.',
    input_schema: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          enum: [...ALLOWED_ROUTES],
          description: 'Zielseite in der App',
        },
      },
      required: ['route'],
    },
  },
];

/** Set aller Write-Tool-Namen (benoetigen Nutzer-Bestaetigung vor Ausfuehrung) */
export const WRITE_TOOLS = new Set([
  'create_bulletin_post',
  'create_help_request',
  'create_event',
  'report_issue',
  'create_marketplace_listing',
  'update_help_offers',
  'send_message',
  'update_profile',
]);
