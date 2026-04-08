// Nachbar.io — Companion Tool-Executor
// Fuehrt die 11 Companion-Tools gegen Supabase aus

import { createClient } from "@/lib/supabase/server";
import { WRITE_TOOLS } from "./tools";

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
async function getUserContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, household:households!inner(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership?.household) return null;

  const household = Array.isArray(membership.household)
    ? membership.household[0]
    : membership.household;
  const quarterId = (household as { quarter_id: string }).quarter_id;

  return { quarterId, householdId: membership.household_id };
}

/**
 * Formatiert ein ISO-Datum als deutschen Text (z.B. "Mo, 24.03.2026").
 */
function formatDateDE(isoDate: string): string {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const d = new Date(isoDate + "T00:00:00");
  const dayName = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}.${mm}.${yyyy}`;
}

/**
 * Muelltyp-Labels fuer deutsche Anzeige.
 */
const WASTE_TYPE_LABELS: Record<string, string> = {
  restmuell: "Restmuell",
  biomuell: "Biomuell",
  papier: "Papier/Karton",
  gelber_sack: "Gelber Sack",
  glas: "Glas",
  spermuell: "Sperrmuell",
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
  userId: string,
): Promise<ToolResult> {
  try {
    const supabase = await createClient();

    switch (toolName) {
      // ── Write-Tools ──────────────────────────────────────────────

      case "create_bulletin_post": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        // Kategorie-Mapping: Companion-Kategorien auf alerts-Tabellen-Constraint mappen
        // alerts_category_check erlaubt: fire, medical, crime, water_damage, power_outage,
        // door_lock, fall, shopping, tech_help, pet, other
        const categoryMap: Record<string, string> = {
          info: "other",
          help: "other",
          event: "other",
          offer: "other",
          fire: "fire",
          medical: "medical",
          crime: "crime",
          water_damage: "water_damage",
          power_outage: "power_outage",
          door_lock: "door_lock",
          fall: "fall",
          shopping: "shopping",
          tech_help: "tech_help",
          pet: "pet",
          other: "other",
        };
        const rawCat = (params.category as string) ?? "other";
        const mappedCategory = categoryMap[rawCat] ?? "other";

        const { error } = await supabase.from("alerts").insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          household_id: ctx.householdId,
          title: params.title as string,
          description: params.text as string,
          category: mappedCategory,
          status: "open",
          is_emergency: false,
          current_radius: 1,
        });

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        return {
          success: true,
          summary: `Beitrag "${params.title}" wurde auf dem Schwarzen Brett veroeffentlicht.`,
        };
      }

      case "create_help_request": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const expiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { error } = await supabase.from("help_requests").insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          type: "need",
          category: params.category as string,
          title: (params.title as string).trim(),
          description:
            (params.description as string | undefined)?.trim() ?? null,
          status: "active",
          expires_at: expiresAt,
        });

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        return {
          success: true,
          summary: `Hilfsanfrage "${params.title}" wurde erstellt.`,
        };
      }

      case "create_event": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const eventDate = params.date as string;
        const eventTime = (params.time as string) ?? "12:00";

        const { error } = await supabase.from("events").insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          title: (params.title as string).trim(),
          description:
            (params.description as string | undefined)?.trim() ?? null,
          location: (params.location as string | undefined)?.trim() ?? null,
          event_date: eventDate,
          event_time: eventTime,
          category: "community",
        });

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        return {
          success: true,
          summary: `Veranstaltung "${params.title}" am ${formatDateDE(eventDate)} um ${eventTime} Uhr erstellt.`,
        };
      }

      case "report_issue": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const { error } = await supabase.from("issue_reports").insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          description: (params.description as string).trim(),
          location: (params.location as string | undefined)?.trim() ?? null,
          status: "open",
        });

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        return {
          success: true,
          summary: "Maengelmeldung wurde erfolgreich eingereicht.",
        };
      }

      case "create_marketplace_listing": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        // Typ-Mapping: 'free' → 'give' (Datenbank erwartet 'give')
        const typeMap: Record<string, string> = {
          offer: "sell",
          request: "search",
          free: "give",
        };
        const dbType = typeMap[params.type as string] ?? "sell";

        const { error } = await supabase.from("marketplace_items").insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          type: dbType,
          category: "other",
          title: (params.title as string).trim(),
          description:
            (params.description as string | undefined)?.trim() ?? null,
          price: (params.price as number | undefined) ?? null,
          images: [],
          status: "active",
        });

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        return {
          success: true,
          summary: `Inserat "${params.title}" wurde auf dem Marktplatz veroeffentlicht.`,
        };
      }

      case "update_help_offers": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const categories = params.categories as string[];

        // Bestehende Skills loeschen
        await supabase.from("skills").delete().eq("user_id", userId);

        // Neue Skills einfuegen
        if (categories.length > 0) {
          const inserts = categories.map((cat) => ({
            user_id: userId,
            quarter_id: ctx.quarterId,
            category: cat,
            is_public: true,
          }));
          const { error } = await supabase.from("skills").insert(inserts);
          if (error)
            return { success: false, summary: `Fehler: ${error.message}` };
        }

        return {
          success: true,
          summary: `Hilfsangebote aktualisiert: ${categories.length} Kategorien gespeichert.`,
        };
      }

      case "send_message": {
        const recipientName = (params.recipient_name as string)?.trim();
        const messageText = (params.text as string)?.trim();
        if (!recipientName || !messageText) {
          return {
            success: false,
            summary: "Bitte Empfänger und Nachricht angeben.",
          };
        }

        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        // Empfaenger im Quartier suchen (ueber household_members -> households.quarter_id)
        const { data: recipients } = await supabase
          .from("users")
          .select("id, display_name")
          .ilike("display_name", `%${recipientName}%`)
          .neq("id", userId)
          .limit(5);

        if (!recipients || recipients.length === 0) {
          return {
            success: false,
            summary: `Kein Nutzer "${recipientName}" im Quartier gefunden.`,
          };
        }

        const recipient = recipients[0];

        // Contact-Request erstellen (bestehende Tabelle aus Migration 112)
        const { error } = await supabase.from("contact_requests").insert({
          sender_id: userId,
          recipient_id: recipient.id,
          message: messageText,
          status: "pending",
        });

        if (error)
          return {
            success: false,
            summary: `Fehler beim Senden: ${error.message}`,
          };
        return {
          success: true,
          summary: `Nachricht an ${recipient.display_name} gesendet.`,
          route: "/inbox",
        };
      }

      case "update_profile": {
        const updates: Record<string, string> = {};
        if (params.display_name)
          updates.display_name = (params.display_name as string).trim();
        if (params.bio) updates.bio = (params.bio as string).trim();

        if (Object.keys(updates).length === 0) {
          return { success: false, summary: "Keine Aenderungen angegeben." };
        }

        const { error } = await supabase
          .from("users")
          .update(updates)
          .eq("id", userId);

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        return { success: true, summary: "Profil wurde aktualisiert." };
      }

      case "create_meal": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const mealType = params.type as string;
        const mealDate = params.meal_date as string;
        const mealTime = (params.meal_time as string | undefined) ?? null;
        const servingsNum = params.servings as number;

        // expires_at berechnen
        let expiresAt: string;
        if (mealType === "portion") {
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

        const { error } = await supabase.from("shared_meals").insert({
          user_id: userId,
          quarter_id: ctx.quarterId,
          type: mealType,
          title: (params.title as string).trim(),
          description:
            (params.description as string | undefined)?.trim() ?? null,
          servings: servingsNum,
          meal_date: mealDate,
          meal_time: mealTime,
          cost_hint: (params.cost_hint as string | undefined)?.trim() ?? null,
          expires_at: expiresAt,
          status: "active",
        });

        if (error)
          return { success: false, summary: `Fehler: ${error.message}` };
        const typeLabel = mealType === "portion" ? "Portionen" : "Plaetze";
        return {
          success: true,
          summary: `Angebot "${params.title}" erstellt — ${servingsNum} ${typeLabel} am ${formatDateDE(mealDate)}${mealTime ? ` um ${mealTime} Uhr` : ""}.`,
        };
      }

      // ── Read-Tools ───────────────────────────────────────────────

      case "list_meals": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const todayStr = new Date().toISOString().split("T")[0];
        const { data: meals } = await supabase
          .from("shared_meals")
          .select(
            "title, type, servings, meal_date, meal_time, cost_hint, user:users(display_name)",
          )
          .eq("quarter_id", ctx.quarterId)
          .eq("status", "active")
          .gte("meal_date", todayStr)
          .order("meal_date", { ascending: true })
          .limit(10);

        if (!meals || meals.length === 0) {
          return {
            success: true,
            summary: "Aktuell keine Mitess-Angebote im Quartier.",
            data: [],
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = (meals as any[]).map((m, i: number) => {
          const user = Array.isArray(m.user) ? m.user[0] : m.user;
          let line = `${i + 1}. ${m.title} (${m.servings} ${m.type === "portion" ? "Portionen" : "Plaetze"})`;
          if (m.meal_time) line += ` ab ${String(m.meal_time).slice(0, 5)} Uhr`;
          line += ` am ${formatDateDE(m.meal_date)}`;
          if (m.cost_hint) line += ` — ${m.cost_hint}`;
          if (user?.display_name) line += ` — von ${user.display_name}`;
          return line;
        });

        return {
          success: true,
          summary: `Aktuelle Mitess-Angebote:\n${lines.join("\n")}`,
          data: meals,
        };
      }

      case "get_waste_dates": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        // Abfuhrgebiete fuer dieses Quartier
        const { data: areaLinks } = await supabase
          .from("quarter_collection_areas")
          .select("area_id")
          .eq("quarter_id", ctx.quarterId);

        const areaIds = (areaLinks ?? []).map(
          (a: { area_id: string }) => a.area_id,
        );
        if (areaIds.length === 0) {
          return {
            success: true,
            summary: "Keine Muelltermine fuer Ihr Quartier hinterlegt.",
            data: [],
          };
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const { data: dates } = await supabase
          .from("waste_collection_dates")
          .select("collection_date, waste_type")
          .in("area_id", areaIds)
          .gte("collection_date", todayStr)
          .eq("is_cancelled", false)
          .order("collection_date", { ascending: true })
          .limit(5);

        const items = (dates ?? []).map(
          (d: { collection_date: string; waste_type: string }) => ({
            date: formatDateDE(d.collection_date),
            type: WASTE_TYPE_LABELS[d.waste_type] ?? d.waste_type,
          }),
        );

        const lines = items.map(
          (i: { date: string; type: string }) => `${i.date}: ${i.type}`,
        );
        return {
          success: true,
          summary:
            items.length > 0
              ? `Naechste Muelltermine:\n${lines.join("\n")}`
              : "Keine anstehenden Muelltermine gefunden.",
          data: items,
        };
      }

      case "get_upcoming_events": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const todayStr = new Date().toISOString().split("T")[0];
        const { data: events } = await supabase
          .from("events")
          .select("title, event_date, event_time, location")
          .eq("quarter_id", ctx.quarterId)
          .gte("event_date", todayStr)
          .order("event_date", { ascending: true })
          .limit(5);

        const items = (events ?? []).map(
          (e: {
            title: string;
            event_date: string;
            event_time?: string;
            location?: string;
          }) => ({
            title: e.title,
            date: formatDateDE(e.event_date),
            time: e.event_time ?? null,
            location: e.location ?? null,
          }),
        );

        const lines = items.map(
          (i: {
            title: string;
            date: string;
            time: string | null;
            location: string | null;
          }) => {
            let line = `${i.date}`;
            if (i.time) line += ` ${i.time} Uhr`;
            line += `: ${i.title}`;
            if (i.location) line += ` (${i.location})`;
            return line;
          },
        );

        return {
          success: true,
          summary:
            items.length > 0
              ? `Naechste Veranstaltungen:\n${lines.join("\n")}`
              : "Keine anstehenden Veranstaltungen gefunden.",
          data: items,
        };
      }

      case "get_help_requests": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const { data: requests } = await supabase
          .from("help_requests")
          .select(
            "title, category, status, user:users(display_name), created_at",
          )
          .eq("quarter_id", ctx.quarterId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!requests || requests.length === 0) {
          return {
            success: true,
            summary: "Aktuell keine offenen Hilfsanfragen im Quartier.",
            data: [],
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = (requests as any[]).map((r, i: number) => {
          const user = Array.isArray(r.user) ? r.user[0] : r.user;
          return `${i + 1}. ${r.title} (${r.category}) — von ${user?.display_name ?? "Unbekannt"}`;
        });

        return {
          success: true,
          summary: `${requests.length} offene Hilfsanfragen:\n${lines.join("\n")}`,
          data: requests,
          route: "/help",
        };
      }

      case "get_news": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return {
            success: false,
            summary: "Quartier-Zuordnung nicht gefunden.",
          };

        const { data: news } = await supabase
          .from("quartier_news")
          .select("title, summary, category, published_at")
          .eq("quarter_id", ctx.quarterId)
          .order("published_at", { ascending: false })
          .limit(5);

        if (!news || news.length === 0) {
          return {
            success: true,
            summary: "Keine aktuellen Quartiersnachrichten.",
            data: [],
          };
        }

        const lines = news.map(
          (
            n: { title: string; summary?: string; category: string },
            i: number,
          ) => {
            return `${i + 1}. [${n.category}] ${n.title}${n.summary ? ": " + n.summary.slice(0, 80) : ""}`;
          },
        );

        return {
          success: true,
          summary: `Neueste Quartiersnachrichten:\n${lines.join("\n")}`,
          data: news,
          route: "/news",
        };
      }

      case "get_unread_count": {
        // Ungelesene Benachrichtigungen zaehlen
        const { count: notifCount } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("read", false);

        const unread = notifCount ?? 0;
        if (unread === 0) {
          return {
            success: true,
            summary: "Keine neuen Benachrichtigungen — alles gelesen!",
            data: { unread: 0 },
          };
        }

        return {
          success: true,
          summary: `Sie haben ${unread} ungelesene ${unread === 1 ? "Benachrichtigung" : "Benachrichtigungen"}.`,
          data: { unread },
          route: "/notifications",
        };
      }

      case "do_checkin": {
        const status = params.status as string;
        const note = (params.note as string | undefined)?.trim() ?? null;

        const statusLabels: Record<string, string> = {
          good: "Mir geht es gut",
          okay: "Es geht so",
          bad: "Mir geht es nicht gut",
        };

        const { error } = await supabase.from("checkins").insert({
          user_id: userId,
          status,
          note,
        });

        if (error)
          return {
            success: false,
            summary: `Check-in fehlgeschlagen: ${error.message}`,
          };

        return {
          success: true,
          summary: `Check-in gespeichert: "${statusLabels[status] ?? status}". ${note ? `Nachricht: ${note}` : "Danke!"}`,
        };
      }

      case "web_search": {
        const query = (params.query as string)?.trim();
        if (!query) {
          return { success: false, summary: "Bitte geben Sie einen Suchbegriff an." };
        }

        const braveKey = process.env.BRAVE_SEARCH_API_KEY;
        if (!braveKey) {
          return {
            success: false,
            summary: "Internetsuche ist gerade nicht verfuegbar. Bitte versuchen Sie es spaeter.",
          };
        }

        try {
          const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=de&country=de&text_decorations=false`;
          const searchRes = await fetch(searchUrl, {
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip",
              "X-Subscription-Token": braveKey,
            },
          });

          if (!searchRes.ok) {
            console.error("[web_search] Brave API Fehler:", searchRes.status);
            return { success: false, summary: "Internetsuche fehlgeschlagen." };
          }

          const searchData = await searchRes.json();
          const results = (searchData.web?.results ?? []).slice(0, 5);

          if (results.length === 0) {
            return { success: true, summary: `Keine Ergebnisse gefunden fuer "${query}".` };
          }

          // Ergebnisse kompakt fuer Claude zusammenfassen
          const lines = results.map(
            (r: { title: string; description: string; url: string }, i: number) =>
              `${i + 1}. ${r.title}\n   ${r.description}\n   Quelle: ${r.url}`,
          );

          return {
            success: true,
            summary: `Suchergebnisse fuer "${query}":\n\n${lines.join("\n\n")}`,
            data: results.map((r: { title: string; description: string; url: string }) => ({
              title: r.title,
              snippet: r.description,
              url: r.url,
            })),
          };
        } catch (err) {
          console.error("[web_search] Fehler:", err);
          return { success: false, summary: "Internetsuche fehlgeschlagen." };
        }
      }

      case "navigate_to": {
        const route = params.route as string;
        return {
          success: true,
          summary: `Navigation zu ${route}`,
          route,
        };
      }

      // ── Gruppen-Tools ──────────────────────────────────────────

      case "create_group": {
        const ctx = await getUserContext(supabase, userId);
        if (!ctx)
          return { success: false, summary: "Kein Quartier zugeordnet." };

        const { data: group, error: groupErr } = await supabase
          .from("groups")
          .insert({
            quarter_id: ctx.quarterId,
            name: (params.name as string).trim(),
            description:
              (params.description as string | undefined)?.trim() || null,
            category: params.category as string,
            type: (params.type as string) ?? "open",
            creator_id: userId,
            member_count: 1,
          })
          .select()
          .single();

        if (groupErr)
          return { success: false, summary: `Fehler: ${groupErr.message}` };

        await supabase.from("group_members").insert({
          group_id: group.id,
          user_id: userId,
          role: "founder",
          status: "active",
        });

        return {
          success: true,
          summary: `Gruppe "${group.name}" wurde erstellt. Sie sind automatisch als Gruender eingetragen.`,
          data: group,
          route: `/gruppen/${group.id}`,
        };
      }

      case "create_group_post": {
        // Gruppe anhand Name finden
        const groupName = (params.group_name as string).trim().toLowerCase();
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name")
          .ilike("name", `%${groupName}%`)
          .limit(5);

        if (!groups || groups.length === 0) {
          return {
            success: false,
            summary: `Keine Gruppe mit dem Namen "${params.group_name}" gefunden.`,
          };
        }

        const targetGroup = groups[0];

        // Mitgliedschaft pruefen
        const { data: membership } = await supabase
          .from("group_members")
          .select("status")
          .eq("group_id", targetGroup.id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          return {
            success: false,
            summary: `Sie sind kein aktives Mitglied der Gruppe "${targetGroup.name}".`,
          };
        }

        const { data: post, error: postErr } = await supabase
          .from("group_posts")
          .insert({
            group_id: targetGroup.id,
            user_id: userId,
            content: (params.content as string).trim(),
          })
          .select()
          .single();

        if (postErr)
          return { success: false, summary: `Fehler: ${postErr.message}` };

        return {
          success: true,
          summary: `Beitrag in "${targetGroup.name}" veroeffentlicht.`,
          data: post,
          route: `/gruppen/${targetGroup.id}`,
        };
      }

      case "list_my_groups": {
        const { data: memberships } = await supabase
          .from("group_members")
          .select("group_id, groups(name, member_count, category)")
          .eq("user_id", userId)
          .eq("status", "active");

        if (!memberships || memberships.length === 0) {
          return {
            success: true,
            summary: "Sie sind noch keiner Gruppe beigetreten.",
          };
        }

        const lines = memberships.map((m, i) => {
          const g = Array.isArray(m.groups) ? m.groups[0] : m.groups;
          const group = g as {
            name: string;
            member_count: number;
            category: string;
          } | null;
          return `${i + 1}. ${group?.name ?? "Unbekannt"} (${group?.member_count ?? 0} Mitglieder)`;
        });

        return {
          success: true,
          summary: `Sie sind Mitglied in ${memberships.length} ${memberships.length === 1 ? "Gruppe" : "Gruppen"}:\n${lines.join("\n")}`,
          data: memberships,
          route: "/gruppen",
        };
      }

      default:
        return { success: false, summary: `Unbekanntes Tool: ${toolName}` };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error(`[companion/tool-executor] Fehler bei ${toolName}:`, error);
    return { success: false, summary: `Interner Fehler: ${message}` };
  }
}
