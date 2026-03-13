// lib/notifications.ts
// Nachbar.io — Client-seitige Notification-Erstellung
// Delegiert an Server-API-Route /api/notifications/create
// Server nutzt Service Role Key → kein RLS-Problem bei INSERT fuer andere Nutzer

// Zentrale Funktion zum Erstellen von Notifications
// Erstellt In-App Notification UND sendet Push-Notification via Server
// Fire-and-forget: Fehler blockieren nicht die Haupt-Aktion
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  referenceId?: string;
  referenceType?: string;
}) {
  try {
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(
        `[notifications] Server-Erstellung fehlgeschlagen fuer user=${params.userId} type=${params.type}:`,
        err.error || response.status
      );
    }
  } catch (err) {
    // Notification-Fehler loggen fuer Bug-Reports
    console.error("[notifications] createNotification fehlgeschlagen:", err);
  }
}
