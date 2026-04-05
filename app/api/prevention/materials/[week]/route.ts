// GET /api/prevention/materials/[week] — Handout-URL fuer eine Kurswoche
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Wochen-Titel und Beschreibungen fuer Handouts
const WEEK_MATERIALS: Record<
  number,
  { title: string; description: string; topics: string[] }
> = {
  1: {
    title: "Woche 1 — Ankommen & Grundlagen",
    description: "Einführung in die Stressbewältigung, Körperwahrnehmung",
    topics: [
      "Was ist Stress?",
      "Körperliche Stressreaktionen",
      "Progressive Muskelrelaxation (PMR) Einführung",
    ],
  },
  2: {
    title: "Woche 2 — Atemtechniken",
    description: "Atemübungen als schnelle Stressregulation",
    topics: ["4-7-8 Atemtechnik", "Bauchatmung", "Atembeobachtung im Alltag"],
  },
  3: {
    title: "Woche 3 — Achtsamkeit",
    description: "Body Scan und achtsame Wahrnehmung",
    topics: ["Body Scan Übung", "Achtsames Essen", "Gedanken beobachten"],
  },
  4: {
    title: "Woche 4 — Wohlwollen & Mitgefühl",
    description: "Metta-Meditation und Selbstmitgefühl",
    topics: ["Metta-Meditation", "Selbstmitgefühl", "Dankbarkeitsübung"],
  },
  5: {
    title: "Woche 5 — Soziale Aktivierung",
    description: "Gemeinsam aktiv im Quartier",
    topics: [
      "Soziale Ressourcen erkennen",
      "Gemeinsame Spaziergänge",
      "Nachbarschaftshilfe",
    ],
  },
  6: {
    title: "Woche 6 — Bewegung & Natur",
    description: "Körperliche Aktivität als Stresspuffer",
    topics: ["Sanfte Bewegung", "Naturerleben", "Quartiers-Spaziergang"],
  },
  7: {
    title: "Woche 7 — Genuss & Freude",
    description: "Positive Erlebnisse bewusst gestalten",
    topics: ["Genusstraining", "Kreative Aktivitäten", "Kulturelle Teilhabe"],
  },
  8: {
    title: "Woche 8 — Transfer & Abschluss",
    description: "Gelerntes verankern und Ausblick",
    topics: [
      "Persönlicher Stressplan",
      "Rückblick & Reflexion",
      "Weiterführende Angebote",
    ],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ week: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const { week: weekStr } = await params;
  const weekNumber = parseInt(weekStr, 10);

  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 8) {
    return NextResponse.json(
      { error: "Woche muss zwischen 1 und 8 liegen" },
      { status: 400 },
    );
  }

  // Einschreibung pruefen
  const { data: enrollment } = await supabase
    .from("prevention_enrollments")
    .select("id, course:prevention_courses(starts_at)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json(
      { error: "Sie sind in keinem Kurs eingeschrieben" },
      { status: 403 },
    );
  }

  const material = WEEK_MATERIALS[weekNumber];
  if (!material) {
    return NextResponse.json(
      { error: "Material nicht gefunden" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    week: weekNumber,
    ...material,
  });
}
