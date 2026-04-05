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
  '/gruppen', '/gruppen/neue-gruppe',
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

  {
    name: 'create_meal',
    description: 'Erstellt ein neues Mitess-Angebot (Portionen abgeben oder zum Essen einladen).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Was gibt es? (z.B. "Lasagne", "Grillabend")' },
        type: {
          type: 'string',
          enum: ['portion', 'invitation'],
          description: 'Art: portion (Portionen abgeben) oder invitation (zum Essen einladen)',
        },
        servings: { type: 'number', description: 'Anzahl Portionen oder Plaetze' },
        description: { type: 'string', description: 'Beschreibung (optional)' },
        meal_date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
        meal_time: { type: 'string', description: 'Uhrzeit im Format HH:MM (optional)' },
        cost_hint: { type: 'string', description: 'Unkostenbeitrag (optional, z.B. "3 EUR")' },
      },
      required: ['title', 'type', 'servings', 'meal_date'],
    },
  },

  {
    name: 'create_group',
    description: 'Erstellt eine neue Gruppe/Interessengruppe im Quartier. Kategorien: nachbarschaft, sport, garten, kinder, senioren, kultur, ehrenamt, sonstiges.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name der Gruppe (3-60 Zeichen)' },
        category: {
          type: 'string',
          enum: ['nachbarschaft', 'sport', 'garten', 'kinder', 'senioren', 'kultur', 'ehrenamt', 'sonstiges'],
          description: 'Kategorie der Gruppe',
        },
        description: { type: 'string', description: 'Kurze Beschreibung (optional, max 500 Zeichen)' },
        type: {
          type: 'string',
          enum: ['open', 'closed'],
          description: 'open = jeder kann beitreten, closed = Beitritt auf Anfrage. Standard: open',
        },
      },
      required: ['name', 'category'],
    },
  },

  {
    name: 'create_group_post',
    description: 'Erstellt einen neuen Beitrag in einer Gruppe. Der Nutzer muss Mitglied der Gruppe sein.',
    input_schema: {
      type: 'object',
      properties: {
        group_name: { type: 'string', description: 'Name der Gruppe, in der gepostet werden soll' },
        content: { type: 'string', description: 'Inhalt des Beitrags (max 1000 Zeichen)' },
      },
      required: ['group_name', 'content'],
    },
  },

  // ── Read-Tools (sofortige Ausfuehrung) ─────────────────────────

  {
    name: 'list_my_groups',
    description: 'Zeigt alle Gruppen an, in denen der Nutzer Mitglied ist.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'list_meals',
    description: 'Zeigt aktuelle Mitess-Angebote im Quartier an (Portionen und Einladungen).',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

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
    description: 'Navigiert den Nutzer zu einer bestimmten Seite in der App. Routen: /dashboard (Startseite), /alerts (Schwarzes Brett), /alerts/new (Neuer Beitrag), /board (Pinnwand), /marketplace (Marktplatz), /marketplace/new (Neues Inserat), /events (Veranstaltungen), /events/new (Neue Veranstaltung), /help (Nachbarschaftshilfe), /help/new (Neue Hilfsanfrage), /waste-calendar (Muellkalender), /map (Quartierskarte), /profile (Mein Profil), /messages (Nachrichten), /experts (Experten), /settings (Einstellungen), /amtsblatt (Amtsblatt), /mitessen (Gemeinsam essen / Mittagessen teilen), /mitessen/neu (Neues Essensangebot erstellen).',
    input_schema: {
      type: 'object',
      properties: {
        route: {
          type: 'string',
          enum: [...ALLOWED_ROUTES],
          description: 'Zielseite in der App. Nutze /mitessen fuer alles rund um gemeinsames Essen, Mittagessen, Portionen teilen. Nutze /waste-calendar fuer Muelltermine. Nutze /help fuer Nachbarschaftshilfe.',
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
  'create_meal',
  'create_group',
  'create_group_post',
]);
