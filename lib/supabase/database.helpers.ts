// Typ-Helper für generierte Supabase-Types
// Diese Datei wird NICHT von `npm run db:types` überschrieben.
// Regenerieren: `npm run db:types` → database.types.ts wird neu generiert, dieser Helper bleibt.

import type { Database } from './database.types'

/** Zeilen-Typ einer Tabelle (SELECT-Ergebnis) */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Insert-Typ einer Tabelle */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Update-Typ einer Tabelle */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/** Enum-Typ aus der Datenbank */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
