// Nachbar.io — Companion Tool-Executor
// Fuehrt die 11 Companion-Tools gegen Supabase aus

import { createClient } from '@/lib/supabase/server';
import { WRITE_TOOLS } from './tools';

/** Ergebnis einer Tool-Ausfuehrung */
export interface ToolResult {
  success: boolean;
  summary: string;
  data?: unknown;
  route?: string; // Fuer navigate_to
}

/**
 * Prueft ob ein Tool ein Write-Tool ist (benoetigt Nutzer-Bestaetigung).
 */
export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name);
}

/**
 * Hilfsfunktion: Ermittelt quarter_id und household_id des Nutzers.
 */
async function getUserContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, household:households!inner(quarter_id)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!membership?.household) return null;

  const household = Array.isArray(membership.household) ? membership.household[0] : membership.household;
  const quarterId = (household as { quarter_id: string }).quarter_id;

  return { quarterId, householdId: membership.household_id };
}

/**
 * Formatiert ein ISO-Datum als deutschen Text (z.B. "Mo, 24.03.2026").
 */
function formatDateDE(isoDate: string): string {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const d = new Date(isoDate + 'T00:00:00');
  const dayName = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}.${mm}.${yyyy}`;
}

/**
 * Muelltyp-Labels fuer deutsche Anzeige.
 */
const WASTE_TYPE_LABELS: Record<string, string> = {
  restmuell: 'Restmuell',
  biomuell: 'Biomuell',
  papier: 'Papier/Karton',
  gelber_sack: 'Gelber Sack',
  glas: 'Glas',
  spermuell: 'Sperrmuell',
};

/**
 * Fuehrt ein Companion-Tool aus.
 * @param toolName Name des Tools (z.B. 'create_bulletin_post')
 * @param params Parameter aus dem Claude Tool Use Call
 * @param userId Authentifizierter Nutzer
 */
export async function executeCompanionTool(
  toolName: string,
  params: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  try {
    const supabase = await createClient();

    switch (toolName) {
      // ── Write-Tools ──────────────────────────────────────────────

      case 'create_bulletin_post': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const { error } = await supabase.from('alerts').insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          household_id: ctx.householdId,
          title: params.title as string,
          description: params.text as string,
          category: (params.category as string) ?? 'info',
          status: 'active',
          is_emergency: false,
          current_radius: 1,
        });

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        return { success: true, summary: `Beitrag "${params.title}" wurde auf dem Schwarzen Brett veroeffentlicht.` };
      }

      case 'create_help_request': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('help_requests').insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          type: 'need',
          category: params.category as string,
          title: (params.title as string).trim(),
          description: (params.description as string | undefined)?.trim() ?? null,
          status: 'active',
          expires_at: expiresAt,
        });

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        return { success: true, summary: `Hilfsanfrage "${params.title}" wurde erstellt.` };
      }

      case 'create_event': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const eventDate = params.date as string;
        const eventTime = (params.time as string) ?? '12:00';

        const { error } = await supabase.from('events').insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          title: (params.title as string).trim(),
          description: (params.description as string | undefined)?.trim() ?? null,
          location: (params.location as string | undefined)?.trim() ?? null,
          event_date: eventDate,
          event_time: eventTime,
          category: 'community',
        });

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        return {
          success: true,
          summary: `Veranstaltung "${params.title}" am ${formatDateDE(eventDate)} um ${eventTime} Uhr erstellt.`,
        };
      }

      case 'report_issue': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const { error } = await supabase.from('issue_reports').insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          description: (params.description as string).trim(),
          location: (params.location as string | undefined)?.trim() ?? null,
          status: 'open',
        });

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        return { success: true, summary: 'Maengelmeldung wurde erfolgreich eingereicht.' };
      }

      case 'create_marketplace_listing': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        // Typ-Mapping: 'free' → 'give' (Datenbank erwartet 'give')
        const typeMap: Record<string, string> = { offer: 'sell', request: 'search', free: 'give' };
        const dbType = typeMap[params.type as string] ?? 'sell';

        const { error } = await supabase.from('marketplace_items').insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          type: dbType,
          category: 'other',
          title: (params.title as string).trim(),
          description: (params.description as string | undefined)?.trim() ?? null,
          price: (params.price as number | undefined) ?? null,
          images: [],
          status: 'active',
        });

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        return { success: true, summary: `Inserat "${params.title}" wurde auf dem Marktplatz veroeffentlicht.` };
      }

      case 'update_help_offers': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const categories = params.categories as string[];

        // Bestehende Skills loeschen
        await supabase.from('skills').delete().eq('user_id', userId);

        // Neue Skills einfuegen
        if (categories.length > 0) {
          const inserts = categories.map((cat) => ({
            user_id: userId,
            quarter_id: ctx.quarterId,
            category: cat,
            is_public: true,
          }));
          const { error } = await supabase.from('skills').insert(inserts);
          if (error) return { success: false, summary: `Fehler: ${error.message}` };
        }

        return {
          success: true,
          summary: `Hilfsangebote aktualisiert: ${categories.length} Kategorien gespeichert.`,
        };
      }

      case 'send_message': {
        // Nachrichten-Versand ist noch nicht implementiert
        return {
          success: false,
          summary: 'Nachrichten-Versand ist derzeit noch nicht verfuegbar. Bitte nutzen Sie die Nachrichten-Seite direkt.',
        };
      }

      case 'update_profile': {
        const updates: Record<string, string> = {};
        if (params.display_name) updates.display_name = (params.display_name as string).trim();
        if (params.bio) updates.bio = (params.bio as string).trim();

        if (Object.keys(updates).length === 0) {
          return { success: false, summary: 'Keine Aenderungen angegeben.' };
        }

        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        return { success: true, summary: 'Profil wurde aktualisiert.' };
      }

      case 'create_meal': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const mealType = params.type as string;
        const mealDate = params.meal_date as string;
        const mealTime = (params.meal_time as string | undefined) ?? null;
        const servingsNum = params.servings as number;

        // expires_at berechnen
        let expiresAt: string;
        if (mealType === 'portion') {
          const d = new Date(mealDate);
          d.setDate(d.getDate() + 1);
          expiresAt = d.toISOString();
        } else {
          if (mealTime) {
            expiresAt = new Date(`${mealDate}T${mealTime}:00`).toISOString();
          } else {
            const d = new Date(mealDate);
            d.setHours(23, 59, 59);
            expiresAt = d.toISOString();
          }
        }

        const { error } = await supabase.from('shared_meals').insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          type: mealType,
          title: (params.title as string).trim(),
          description: (params.description as string | undefined)?.trim() ?? null,
          servings: servingsNum,
          meal_date: mealDate,
          meal_time: mealTime,
          cost_hint: (params.cost_hint as string | undefined)?.trim() ?? null,
          expires_at: expiresAt,
          status: 'active',
        });

        if (error) return { success: false, summary: `Fehler: ${error.message}` };
        const typeLabel = mealType === 'portion' ? 'Portionen' : 'Plaetze';
        return {
          success: true,
          summary: `Angebot "${params.title}" erstellt — ${servingsNum} ${typeLabel} am ${formatDateDE(mealDate)}${mealTime ? ` um ${mealTime} Uhr` : ''}.`,
        };
      }

      // ── Read-Tools ───────────────────────────────────────────────

      case 'list_meals': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: meals } = await supabase
          .from('shared_meals')
          .select('title, type, servings, meal_date, meal_time, cost_hint, user:users(display_name)')
          .eq('quarter_id', ctx.quarterId)
          .eq('status', 'active')
          .gte('meal_date', todayStr)
          .order('meal_date', { ascending: true })
          .limit(10);

        if (!meals || meals.length === 0) {
          return { success: true, summary: 'Aktuell keine Mitess-Angebote im Quartier.', data: [] };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = (meals as any[]).map((m, i: number) => {
          const user = Array.isArray(m.user) ? m.user[0] : m.user;
          let line = `${i + 1}. ${m.title} (${m.servings} ${m.type === 'portion' ? 'Portionen' : 'Plaetze'})`;
          if (m.meal_time) line += ` ab ${String(m.meal_time).slice(0, 5)} Uhr`;
          line += ` am ${formatDateDE(m.meal_date)}`;
          if (m.cost_hint) line += ` — ${m.cost_hint}`;
          if (user?.display_name) line += ` — von ${user.display_name}`;
          return line;
        });

        return {
          success: true,
          summary: `Aktuelle Mitess-Angebote:\n${lines.join('\n')}`,
          data: meals,
        };
      }

      case 'get_waste_dates': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        // Abfuhrgebiete fuer dieses Quartier
        const { data: areaLinks } = await supabase
          .from('quarter_collection_areas')
          .select('area_id')
          .eq('quarter_id', ctx.quarterId);

        const areaIds = (areaLinks ?? []).map((a: { area_id: string }) => a.area_id);
        if (areaIds.length === 0) {
          return { success: true, summary: 'Keine Muelltermine fuer Ihr Quartier hinterlegt.', data: [] };
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: dates } = await supabase
          .from('waste_collection_dates')
          .select('collection_date, waste_type')
          .in('area_id', areaIds)
          .gte('collection_date', todayStr)
          .eq('is_cancelled', false)
          .order('collection_date', { ascending: true })
          .limit(5);

        const items = (dates ?? []).map((d: { collection_date: string; waste_type: string }) => ({
          date: formatDateDE(d.collection_date),
          type: WASTE_TYPE_LABELS[d.waste_type] ?? d.waste_type,
        }));

        const lines = items.map((i: { date: string; type: string }) => `${i.date}: ${i.type}`);
        return {
          success: true,
          summary: items.length > 0
            ? `Naechste Muelltermine:\n${lines.join('\n')}`
            : 'Keine anstehenden Muelltermine gefunden.',
          data: items,
        };
      }

      case 'get_upcoming_events': {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx) return { success: false, summary: 'Quartier-Zuordnung nicht gefunden.' };

        const todayStr = new Date().toISOString().split('T')[0];
        const { data: events } = await supabase
          .from('events')
          .select('title, event_date, event_time, location')
          .eq('quarter_id', ctx.quarterId)
          .gte('event_date', todayStr)
          .order('event_date', { ascending: true })
          .limit(5);

        const items = (events ?? []).map((e: { title: string; event_date: string; event_time?: string; location?: string }) => ({
          title: e.title,
          date: formatDateDE(e.event_date),
          time: e.event_time ?? null,
          location: e.location ?? null,
        }));

        const lines = items.map((i: { title: string; date: string; time: string | null; location: string | null }) => {
          let line = `${i.date}`;
          if (i.time) line += ` ${i.time} Uhr`;
          line += `: ${i.title}`;
          if (i.location) line += ` (${i.location})`;
          return line;
        });

        return {
          success: true,
          summary: items.length > 0
            ? `Naechste Veranstaltungen:\n${lines.join('\n')}`
            : 'Keine anstehenden Veranstaltungen gefunden.',
          data: items,
        };
      }

      case 'navigate_to': {
        const route = params.route as string;
        return {
          success: true,
          summary: `Navigation zu ${route}`,
          route,
        };
      }

      default:
        return { success: false, summary: `Unbekanntes Tool: ${toolName}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error(`[companion/tool-executor] Fehler bei ${toolName}:`, error);
    return { success: false, summary: `Interner Fehler: ${message}` };
  }
}
