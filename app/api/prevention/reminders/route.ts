// POST /api/prevention/reminders?type=daily|weekly_24h|weekly_1h|caregiver_inactivity|reimbursement
// Cron-Endpunkt fuer Praevention-Erinnerungen
// WICHTIG: getAdminSupabase(), NICHT createClient() (Cron-Route ohne User-Kontext)
import { NextRequest, NextResponse } from "next/server";
import {
  sendDailyReminder,
  sendWeeklyReminder,
  sendCaregiverInactivityNotice,
  sendReimbursementReminder,
} from "@/modules/praevention/services/reminders.service";

export async function POST(req: NextRequest) {
  // Cron-Authentifizierung: Vercel Cron Secret oder Admin-Token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!type) {
    return NextResponse.json(
      { error: "Query-Parameter 'type' erforderlich" },
      { status: 400 },
    );
  }

  try {
    let result;

    switch (type) {
      case "daily":
        result = await sendDailyReminder();
        break;
      case "weekly_24h":
        result = await sendWeeklyReminder(24);
        break;
      case "weekly_1h":
        result = await sendWeeklyReminder(1);
        break;
      case "caregiver_inactivity":
        result = await sendCaregiverInactivityNotice();
        break;
      case "reimbursement":
        result = await sendReimbursementReminder();
        break;
      default:
        return NextResponse.json(
          { error: `Unbekannter Typ: ${type}` },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(`Reminder ${type} error:`, err);
    return NextResponse.json(
      { error: "Reminder fehlgeschlagen" },
      { status: 500 },
    );
  }
}
