type NotificationEvent =
  | "proposed"
  | "confirmed"
  | "counter_proposed"
  | "declined"
  | "cancelled"
  | "reminder"
  | "started";

interface NotificationContent {
  title: string;
  body: string;
  url: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildNotificationContent(
  event: NotificationEvent,
  actorName: string,
  scheduledAt: string
): NotificationContent {
  const date = formatDate(scheduledAt);
  const url = "/care/consultations";

  switch (event) {
    case "proposed":
      return {
        title: "Neuer Terminvorschlag",
        body: `${actorName} schlägt einen Termin am ${date} vor.`,
        url,
      };
    case "confirmed":
      return {
        title: "Termin bestätigt",
        body: `Ihr Termin am ${date} mit ${actorName} wurde bestätigt.`,
        url,
      };
    case "counter_proposed":
      return {
        title: "Neuer Terminvorschlag",
        body: `${actorName} schlägt einen neuen Termin am ${date} vor.`,
        url,
      };
    case "declined":
      return {
        title: "Termin abgelehnt",
        body: `${actorName} hat den Terminvorschlag abgelehnt.`,
        url,
      };
    case "cancelled":
      return {
        title: "Termin abgesagt",
        body: `Der Termin am ${date} mit ${actorName} wurde abgesagt.`,
        url,
      };
    case "reminder":
      return {
        title: "Videosprechstunde in 1 Stunde",
        body: `Ihr Termin mit ${actorName} beginnt am ${date}.`,
        url,
      };
    case "started":
      return {
        title: "Videosprechstunde gestartet",
        body: `${actorName} hat die Sprechstunde gestartet. Treten Sie jetzt bei.`,
        url,
      };
  }
}

// Push-Notification senden (nutzt bestehende Web Push Infrastruktur)
export async function sendAppointmentPush(
  userId: string,
  event: NotificationEvent,
  actorName: string,
  scheduledAt: string
): Promise<void> {
  const content = buildNotificationContent(event, actorName, scheduledAt);

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title: content.title,
      body: content.body,
      url: content.url,
      tag: "appointment",
    }),
  });
}

// E-Mail senden (via Resend, nur wenn E-Mail vorhanden)
export async function sendAppointmentEmail(
  email: string | null,
  event: NotificationEvent,
  actorName: string,
  scheduledAt: string
): Promise<void> {
  if (!email) return;

  const content = buildNotificationContent(event, actorName, scheduledAt);
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "nachbar.io <noreply@nachbar.io>",
      to: email,
      subject: content.title,
      text: `${content.body}\n\nZum Termin: ${process.env.NEXT_PUBLIC_BASE_URL || "https://nachbar-io.vercel.app"}${content.url}`,
    }),
  });
}
