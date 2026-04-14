// API: GET/POST/DELETE /api/speed-dial
// Kurzwahl-Favoriten CRUD — speichert Referenzen auf bestehende Kontakte,
// loest Kontaktdaten zur Lesezeit aus Quell-Tabellen auf
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/modules/care/services/crypto";

function isMissingFavoritesTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("does not exist") === true ||
    (error.message?.includes("schema cache") === true &&
      error.message?.includes("speed_dial_favorites") === true)
  );
}

type LooseQueryResult = { data: Record<string, unknown> | null };
type LooseTableClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<LooseQueryResult>;
        maybeSingle: () => Promise<LooseQueryResult>;
      };
    };
  };
};

// GET /api/speed-dial?userId={bewohner_id}
// Gibt aufgeloeste Favoriten als Array zurueck (Name, Foto, target_user_id)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || user.id;

  // Favoriten laden (RLS prueft Berechtigung)
  const { data: favorites, error } = await supabase
    .from("speed_dial_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (isMissingFavoritesTable(error)) {
    return NextResponse.json([]);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Kontaktdaten aus Quell-Tabellen aufloesen
  const resolved = await Promise.all(
    (favorites || []).map(async (fav) => {
      const contact = await resolveContact(supabase, fav);
      return { ...fav, ...contact };
    }),
  );

  // MUSS Array zurueckgeben (Projekt-Regel)
  return NextResponse.json(resolved);
}

// POST /api/speed-dial
// Neuen Favoriten hinzufuegen (max 5 pro Bewohner)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const body = await req.json();
  const { user_id, source_type, source_id, sort_order } = body;

  // Validierung: Anzahl bestehender Eintraege pruefen
  const { count, error: countError } = await supabase
    .from("speed_dial_favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id);

  if (isMissingFavoritesTable(countError)) {
    return NextResponse.json(
      { error: "Kurzwahl ist in dieser Umgebung noch nicht aktiviert" },
      { status: 503 },
    );
  }

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count || 0) >= 5) {
    return NextResponse.json(
      { error: "Maximal 5 Favoriten erlaubt" },
      { status: 400 },
    );
  }

  // Validierung: sort_order muss 1-5 sein
  if (!sort_order || sort_order < 1 || sort_order > 5) {
    return NextResponse.json(
      { error: "sort_order muss zwischen 1 und 5 liegen" },
      { status: 400 },
    );
  }

  // Einfuegen (Unique-Constraints auf user_id+source_type+source_id und user_id+sort_order)
  const { data, error } = await supabase
    .from("speed_dial_favorites")
    .insert({
      user_id,
      source_type,
      source_id,
      sort_order,
      created_by: user.id,
    })
    .select()
    .single();

  // Unique-Constraint-Verletzung (PostgreSQL Code 23505)
  if (error?.code === "23505") {
    return NextResponse.json(
      { error: "Kontakt oder Position bereits vergeben" },
      { status: 409 },
    );
  }
  if (isMissingFavoritesTable(error)) {
    return NextResponse.json(
      { error: "Kurzwahl ist in dieser Umgebung noch nicht aktiviert" },
      { status: 503 },
    );
  }
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/speed-dial?id={favorite_id}
// Favorit entfernen (RLS prueft Berechtigung)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const { searchParams: delParams } = new URL(req.url);
  const id = delParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const { error } = await supabase
    .from("speed_dial_favorites")
    .delete()
    .eq("id", id);

  if (isMissingFavoritesTable(error)) {
    return NextResponse.json(
      { error: "Kurzwahl ist in dieser Umgebung noch nicht aktiviert" },
      { status: 503 },
    );
  }

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Hilfsfunktion: Kontaktdaten aus Quell-Tabelle laden
// Keine Daten-Duplikation — Aufloesung zur Lesezeit
async function resolveContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fav: Record<string, unknown>,
) {
  const db = supabase as unknown as LooseTableClient;
  const sourceType = fav.source_type as string;
  const sourceId = fav.source_id as string;
  const userId = fav.user_id as string;

  switch (sourceType) {
    case "caregiver_link": {
      // Profil aus profiles-Tabelle laden (source_id = Profil-ID)
      const { data } = await db
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", sourceId)
        .single();
      return {
        display_name: data?.full_name || "Kontakt",
        avatar_url: data?.avatar_url || null,
        target_user_id: data?.id || null,
        phone_number: null,
      };
    }

    case "emergency_contact": {
      // Notfallkontakt aus verschluesselter Notfallmappe laden
      // source_id = 'emergency_contact_1' oder 'emergency_contact_2'
      const idx = sourceId.endsWith("_2") ? 1 : 0; // Array-Index
      const { data: profile } = await db
        .from("emergency_profiles")
        .select("level1_encrypted")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile?.level1_encrypted) {
        try {
          const level1 = JSON.parse(
            decrypt(profile.level1_encrypted as string),
          );
          const contacts = level1.emergencyContacts || [];
          const contact = contacts[idx];
          if (contact) {
            return {
              display_name: contact.name || "Notfallkontakt",
              phone_number: contact.phone || null,
              avatar_url: null,
              target_user_id: null, // Kein App-User, nur Telefonnummer
            };
          }
        } catch {
          // Entschluesselung fehlgeschlagen — Fallback
        }
      }
      return {
        display_name: "Notfallkontakt",
        phone_number: null,
        avatar_url: null,
        target_user_id: null,
      };
    }

    case "memory_contact": {
      // Kontakt aus Gedaechtnis-Eintraegen laden
      const { data } = await db
        .from("memory_entries")
        .select("content")
        .eq("id", sourceId)
        .single();
      const content = data?.content;
      return {
        display_name:
          (typeof content === "object" && content?.name) ||
          (typeof content === "string" && content) ||
          "Kontakt",
        avatar_url: null,
        target_user_id: null,
        phone_number: null,
      };
    }

    default:
      return {
        display_name: "Unbekannt",
        avatar_url: null,
        target_user_id: null,
        phone_number: null,
      };
  }
}
