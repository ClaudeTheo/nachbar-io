// Nachbar Hilfe — E-Mail-Service (Resend)
// Sammelabrechnung + Verbindungs-Benachrichtigungen
import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[hilfe-email] RESEND_API_KEY nicht konfiguriert");
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "Nachbar.io Hilfe <hilfe@nachbar.io>";

const MONTH_NAMES: Record<string, string> = {
  "01": "Januar",
  "02": "Februar",
  "03": "Maerz",
  "04": "April",
  "05": "Mai",
  "06": "Juni",
  "07": "Juli",
  "08": "August",
  "09": "September",
  "10": "Oktober",
  "11": "November",
  "12": "Dezember",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-");
  return `${MONTH_NAMES[month] || month} ${year}`;
}

export function getMonthlyReportSubject(
  monthYear: string,
  helperName: string,
): string {
  return `Sammelabrechnung ${getMonthLabel(monthYear)} — ${helperName}`;
}

/**
 * Sendet Sammelabrechnung als PDF-Anhang per E-Mail.
 */
export async function sendMonthlyReportEmail(params: {
  to: string;
  helperName: string;
  seniorName: string;
  monthYear: string;
  totalSessions: number;
  totalAmountCents: number;
  pdfBuffer: Buffer;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "E-Mail-Service nicht konfiguriert" };
  }

  const monthLabel = getMonthLabel(params.monthYear);
  const amountStr = `${Math.floor(params.totalAmountCents / 100)},${(params.totalAmountCents % 100).toString().padStart(2, "0")} EUR`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: getMonthlyReportSubject(params.monthYear, params.helperName),
      html: getMonthlyReportHtml({
        helperName: params.helperName,
        seniorName: params.seniorName,
        monthLabel,
        totalSessions: params.totalSessions,
        amountStr,
      }),
      text: getMonthlyReportText({
        helperName: params.helperName,
        seniorName: params.seniorName,
        monthLabel,
        totalSessions: params.totalSessions,
        amountStr,
      }),
      attachments: [
        {
          filename: `Sammelabrechnung_${params.monthYear}_${params.helperName.replace(/\s+/g, "_")}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error(
        "[hilfe-email] Sammelabrechnung-E-Mail fehlgeschlagen:",
        error,
      );
      return { success: false, error: error.message };
    }

    console.log(
      `[hilfe-email] Sammelabrechnung ${params.monthYear} gesendet an ${params.to}`,
    );
    return { success: true };
  } catch (err) {
    console.error("[hilfe-email] Netzwerkfehler:", err);
    return { success: false, error: "Netzwerkfehler beim E-Mail-Versand" };
  }
}

function getMonthlyReportHtml(p: {
  helperName: string;
  seniorName: string;
  monthLabel: string;
  totalSessions: number;
  amountStr: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background-color:#2D3142;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Nachbar.io</h1>
          <p style="margin:8px 0 0;color:#4CAF87;font-size:14px;font-weight:600;">Sammelabrechnung</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#2D3142;font-size:18px;">
            Sammelabrechnung ${escapeHtml(p.monthLabel)}
          </h2>
          <p style="margin:0 0 20px;color:#4a4a4a;font-size:15px;line-height:1.6;">
            Sehr geehrte Damen und Herren,<br><br>
            anbei erhalten Sie die Sammelabrechnung fuer die Nachbarschaftshilfe
            von <strong>${escapeHtml(p.helperName)}</strong>
            fuer <strong>${escapeHtml(p.seniorName)}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0faf4;border-radius:12px;margin-bottom:20px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:4px 0;color:#333;font-size:14px;"><strong>Monat:</strong> ${escapeHtml(p.monthLabel)}</td></tr>
                <tr><td style="padding:4px 0;color:#333;font-size:14px;"><strong>Einsaetze:</strong> ${p.totalSessions}</td></tr>
                <tr><td style="padding:4px 0;color:#333;font-size:14px;"><strong>Gesamtbetrag:</strong> ${escapeHtml(p.amountStr)}</td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;color:#4a4a4a;font-size:14px;line-height:1.6;">
            Die detaillierte Abrechnung finden Sie im Anhang als PDF.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;color:#888;font-size:12px;line-height:1.5;">
            <strong>Hinweis:</strong> Diese Abrechnung dient zur Erstattung des Entlastungsbetrags
            gemaess §45b SGB XI (131 EUR/Monat). Allgemeine Informationen, keine Rechtsberatung.
          </p>
        </td></tr>
        <tr><td style="background-color:#f8f8fa;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:11px;">Nachbar.io — Quartiers-Plattform<br>Erstellt mit nachbar.io</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getMonthlyReportText(p: {
  helperName: string;
  seniorName: string;
  monthLabel: string;
  totalSessions: number;
  amountStr: string;
}): string {
  return `Sammelabrechnung ${p.monthLabel}

Sehr geehrte Damen und Herren,

anbei die Sammelabrechnung fuer die Nachbarschaftshilfe von ${p.helperName} fuer ${p.seniorName}.

Monat: ${p.monthLabel}
Einsaetze: ${p.totalSessions}
Gesamtbetrag: ${p.amountStr}

Die detaillierte Abrechnung finden Sie im Anhang als PDF.

Hinweis: Erstattung gemaess §45b SGB XI. Allgemeine Informationen, keine Rechtsberatung.

--
Nachbar.io — Quartiers-Plattform`;
}
