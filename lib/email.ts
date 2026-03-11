// Nachbar.io — E-Mail-Service (Resend)
// Zentrale E-Mail-Logik fuer Einladungen und Benachrichtigungen

import { Resend } from "resend";

// Resend-Client (Singleton)
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY nicht konfiguriert — E-Mail-Versand deaktiviert");
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Absender-Adresse (Resend erfordert verifizierte Domain oder onboarding@resend.dev)
const FROM_ADDRESS = process.env.EMAIL_FROM || "Nachbar.io <onboarding@resend.dev>";

// ============================================================
// Einladungs-E-Mail
// ============================================================
export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  inviteCode: string;
  registerUrl: string;
  streetName: string;
  houseNumber: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "E-Mail-Service nicht konfiguriert" };
  }

  const formattedCode = `${params.inviteCode.slice(0, 4)}-${params.inviteCode.slice(4)}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `${params.inviterName} lädt Sie zu Nachbar.io ein`,
      html: getInvitationEmailHtml({
        inviterName: params.inviterName,
        inviteCode: formattedCode,
        registerUrl: params.registerUrl,
        streetName: params.streetName,
        houseNumber: params.houseNumber,
      }),
      text: getInvitationEmailText({
        inviterName: params.inviterName,
        inviteCode: formattedCode,
        registerUrl: params.registerUrl,
        streetName: params.streetName,
        houseNumber: params.houseNumber,
      }),
    });

    if (error) {
      console.error("E-Mail-Versand fehlgeschlagen:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("E-Mail-Service Fehler:", err);
    return { success: false, error: "Netzwerkfehler beim E-Mail-Versand" };
  }
}

// ============================================================
// Verifizierungs-Benachrichtigung
// ============================================================
export async function sendVerificationResultEmail(params: {
  to: string;
  userName: string;
  approved: boolean;
  adminNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "E-Mail-Service nicht konfiguriert" };
  }

  const subject = params.approved
    ? "Willkommen bei Nachbar.io — Konto freigeschaltet!"
    : "Nachbar.io — Verifizierung nicht bestätigt";

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject,
      html: getVerificationEmailHtml(params),
      text: getVerificationEmailText(params),
    });

    if (error) {
      console.error("Verifizierungs-E-Mail fehlgeschlagen:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("E-Mail-Service Fehler:", err);
    return { success: false, error: "Netzwerkfehler" };
  }
}

// ============================================================
// E-Mail-Vorlagen — Einladung
// ============================================================
function getInvitationEmailHtml(params: {
  inviterName: string;
  inviteCode: string;
  registerUrl: string;
  streetName: string;
  houseNumber: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Einladung zu Nachbar.io</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#2D3142; padding:28px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                🏘️ Nachbar.io
              </h1>
              <p style="margin:8px 0 0; color:#a0a4b8; font-size:13px;">
                Ihre Quartiers-App
              </p>
            </td>
          </tr>

          <!-- Inhalt -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; color:#2D3142; font-size:18px; font-weight:600;">
                Guten Tag!
              </h2>
              <p style="margin:0 0 20px; color:#4a4a4a; font-size:15px; line-height:1.6;">
                <strong>${escapeHtml(params.inviterName)}</strong> aus Ihrer Nachbarschaft lädt Sie ein,
                Teil der Quartiers-Community zu werden.
              </p>

              <!-- Adress-Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0faf4; border-radius:12px; margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; color:#4CAF87; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                      Einladung für
                    </p>
                    <p style="margin:6px 0 0; color:#2D3142; font-size:16px; font-weight:600;">
                      ${escapeHtml(params.streetName)} ${escapeHtml(params.houseNumber)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Code -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8fa; border:2px dashed #d0d0d8; border-radius:12px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px; text-align:center;">
                    <p style="margin:0 0 8px; color:#6b6b6b; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                      Ihr Einladungscode
                    </p>
                    <p style="margin:0; color:#2D3142; font-size:28px; font-weight:700; letter-spacing:4px; font-family:monospace;">
                      ${escapeHtml(params.inviteCode)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(params.registerUrl)}"
                       style="display:inline-block; background-color:#4CAF87; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:10px; font-size:16px; font-weight:600; letter-spacing:0.3px;">
                      Jetzt registrieren
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0; color:#888; font-size:13px; line-height:1.5; text-align:center;">
                Oder kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${escapeHtml(params.registerUrl)}" style="color:#4CAF87; word-break:break-all; font-size:12px;">
                  ${escapeHtml(params.registerUrl)}
                </a>
              </p>
            </td>
          </tr>

          <!-- Was ist Nachbar.io? -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px; color:#2D3142; font-size:14px; font-weight:600;">
                      Was ist Nachbar.io?
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0; color:#555; font-size:13px;">🔔 Soforthilfe bei Notfällen</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; color:#555; font-size:13px;">🤝 Nachbarschaftshilfe anfragen & anbieten</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; color:#555; font-size:13px;">📅 Quartiers-Veranstaltungen</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; color:#555; font-size:13px;">🗺️ Interaktive Quartierskarte</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; color:#555; font-size:13px;">📰 Lokale Nachrichten</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f8fa; padding:20px 32px; text-align:center; border-top:1px solid #eee;">
              <p style="margin:0; color:#999; font-size:11px; line-height:1.5;">
                Diese E-Mail wurde im Auftrag von ${escapeHtml(params.inviterName)} gesendet.<br>
                Nachbar.io — Quartiers-App Bad Säckingen<br>
                Der Code ist 30 Tage gültig.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getInvitationEmailText(params: {
  inviterName: string;
  inviteCode: string;
  registerUrl: string;
  streetName: string;
  houseNumber: string;
}): string {
  return `Guten Tag!

${params.inviterName} aus Ihrer Nachbarschaft lädt Sie ein, Teil der Quartiers-Community Nachbar.io zu werden.

Einladung für: ${params.streetName} ${params.houseNumber}

Ihr Einladungscode: ${params.inviteCode}

Registrieren Sie sich hier:
${params.registerUrl}

Was ist Nachbar.io?
- Soforthilfe bei Notfällen
- Nachbarschaftshilfe anfragen & anbieten
- Quartiers-Veranstaltungen
- Interaktive Quartierskarte
- Lokale Nachrichten

Der Code ist 30 Tage gültig.

—
Nachbar.io — Quartiers-App Bad Säckingen`;
}

// ============================================================
// E-Mail-Vorlagen — Verifizierung
// ============================================================
function getVerificationEmailHtml(params: {
  userName: string;
  approved: boolean;
  adminNote?: string;
}): string {
  if (params.approved) {
    return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background-color:#4CAF87; padding:28px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px;">✅ Konto freigeschaltet!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#2D3142; font-size:15px; line-height:1.6;">
                Guten Tag ${escapeHtml(params.userName)},<br><br>
                Ihre Adresse wurde bestätigt und Ihr Konto ist jetzt vollständig freigeschaltet.
                Sie können ab sofort alle Funktionen von Nachbar.io nutzen.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar.io"}/dashboard"
                       style="display:inline-block; background-color:#4CAF87; color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:10px; font-size:16px; font-weight:600;">
                      Zum Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8fa; padding:16px 32px; text-align:center;">
              <p style="margin:0; color:#999; font-size:11px;">Nachbar.io — Quartiers-App Bad Säckingen</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Abgelehnt
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background-color:#2D3142; padding:28px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px;">Verifizierung nicht bestätigt</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#2D3142; font-size:15px; line-height:1.6;">
                Guten Tag ${escapeHtml(params.userName)},<br><br>
                Leider konnte Ihre Adress-Verifizierung nicht bestätigt werden.
                ${params.adminNote ? `<br><br><strong>Hinweis:</strong> ${escapeHtml(params.adminNote)}` : ""}
              </p>
              <p style="color:#666; font-size:14px; line-height:1.6;">
                Bitte wenden Sie sich an einen Admin, wenn Sie Fragen haben.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f8fa; padding:16px 32px; text-align:center;">
              <p style="margin:0; color:#999; font-size:11px;">Nachbar.io — Quartiers-App Bad Säckingen</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getVerificationEmailText(params: {
  userName: string;
  approved: boolean;
  adminNote?: string;
}): string {
  if (params.approved) {
    return `Guten Tag ${params.userName},

Ihre Adresse wurde bestätigt und Ihr Konto ist jetzt vollständig freigeschaltet.
Sie können ab sofort alle Funktionen von Nachbar.io nutzen.

Zum Dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || "https://nachbar.io"}/dashboard

—
Nachbar.io — Quartiers-App Bad Säckingen`;
  }

  return `Guten Tag ${params.userName},

Leider konnte Ihre Adress-Verifizierung nicht bestätigt werden.
${params.adminNote ? `Hinweis: ${params.adminNote}` : ""}

Bitte wenden Sie sich an einen Admin, wenn Sie Fragen haben.

—
Nachbar.io — Quartiers-App Bad Säckingen`;
}

// ============================================================
// Hilfsfunktionen
// ============================================================
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
