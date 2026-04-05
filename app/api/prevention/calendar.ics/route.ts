// GET /api/prevention/calendar.ics?enrollmentId=xxx
// ICS-Kalender-Export fuer Praevention-Termine (RFC 5545)
// Importierbar in Google Calendar, Apple Calendar, Outlook
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Nicht angemeldet", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const enrollmentId = searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return new NextResponse("enrollmentId erforderlich", { status: 400 });
    }

    // Enrollment + Kurs laden
    const { data: enrollment } = await supabase
      .from("prevention_enrollments")
      .select(
        `
        id,
        course:prevention_courses(
          id, title, starts_at, ends_at,
          instructor:users!prevention_courses_instructor_id_fkey(display_name)
        )
      `,
      )
      .eq("id", enrollmentId)
      .eq("user_id", user.id)
      .single();

    if (!enrollment || !enrollment.course) {
      return new NextResponse("Einschreibung nicht gefunden", { status: 404 });
    }

    const course = enrollment.course as unknown as {
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      instructor: { display_name: string } | null;
    };

    // Gruppen-Termine laden
    const { data: groupCalls } = await supabase
      .from("prevention_group_calls")
      .select("week_number, scheduled_at, duration_minutes")
      .eq("course_id", course.id)
      .order("week_number");

    // ICS-Datei generieren
    const icsLines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nachbar.io//Praevention//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${course.title}`,
    ];

    const instructorName = course.instructor?.display_name || "Kursleiter";
    const courseStart = new Date(course.starts_at);

    if (groupCalls && groupCalls.length > 0) {
      // Reale Gruppen-Termine verwenden
      for (const call of groupCalls) {
        const start = new Date(call.scheduled_at);
        const end = new Date(
          start.getTime() + (call.duration_minutes || 60) * 60000,
        );

        icsLines.push(
          "BEGIN:VEVENT",
          `UID:prevention-${course.id}-w${call.week_number}@nachbar.io`,
          `DTSTART:${formatICSDate(start)}`,
          `DTEND:${formatICSDate(end)}`,
          `SUMMARY:${course.title} — Woche ${call.week_number}`,
          `DESCRIPTION:Gruppen-Sitzung Woche ${call.week_number} mit ${instructorName}. Thema: Stressbewältigung im Alltag.`,
          `ORGANIZER;CN=${instructorName}:MAILTO:noreply@nachbar.io`,
          "STATUS:CONFIRMED",
          `DTSTAMP:${formatICSDate(new Date())}`,
          "END:VEVENT",
        );
      }
    } else {
      // Fallback: 8 woechentliche Termine ab Kursbeginn generieren
      for (let week = 1; week <= 8; week++) {
        const start = new Date(
          courseStart.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000,
        );
        // Standard: Mittwoch 10:00 Uhr
        start.setHours(10, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60000); // 60 Min

        icsLines.push(
          "BEGIN:VEVENT",
          `UID:prevention-${course.id}-w${week}@nachbar.io`,
          `DTSTART:${formatICSDate(start)}`,
          `DTEND:${formatICSDate(end)}`,
          `SUMMARY:${course.title} — Woche ${week}`,
          `DESCRIPTION:Gruppen-Sitzung Woche ${week} mit ${instructorName}. Stressbewältigung nach § 20 SGB V.`,
          `ORGANIZER;CN=${instructorName}:MAILTO:noreply@nachbar.io`,
          "STATUS:CONFIRMED",
          `DTSTAMP:${formatICSDate(new Date())}`,
          "END:VEVENT",
        );
      }
    }

    icsLines.push("END:VCALENDAR");

    const icsContent = icsLines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${course.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "")}.ics"`,
      },
    });
  } catch (err) {
    console.error("ICS export error:", err);
    return new NextResponse("Fehler beim Exportieren", { status: 500 });
  }
}

// ICS-Datumsformat: 20260405T100000Z (UTC)
function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
