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
const FROM_ADDRESS = process.env.EMAIL_FROM || "QuartierApp <noreply@quartierapp.de>";

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
      subject: `${params.inviterName} lädt Sie zu QuartierApp ein`,
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
    ? "Willkommen bei QuartierApp — Konto freigeschaltet!"
    : "QuartierApp — Verifizierung nicht bestätigt";

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
  <title>Einladung zu QuartierApp</title>
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
                🏘️ QuartierApp
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

          <!-- Was ist QuartierApp? -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px; color:#2D3142; font-size:14px; font-weight:600;">
                      Was ist QuartierApp?
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
                QuartierApp — Ihre digitale Nachbarschaft<br>
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

${params.inviterName} aus Ihrer Nachbarschaft lädt Sie ein, Teil der Quartiers-Community QuartierApp zu werden.

Einladung für: ${params.streetName} ${params.houseNumber}

Ihr Einladungscode: ${params.inviteCode}

Registrieren Sie sich hier:
${params.registerUrl}

Was ist QuartierApp?
- Soforthilfe bei Notfällen
- Nachbarschaftshilfe anfragen & anbieten
- Quartiers-Veranstaltungen
- Interaktive Quartierskarte
- Lokale Nachrichten

Der Code ist 30 Tage gültig.

—
QuartierApp — Ihre digitale Nachbarschaft`;
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
                Sie können ab sofort alle Funktionen von QuartierApp nutzen.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de"}/dashboard"
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
              <p style="margin:0; color:#999; font-size:11px;">QuartierApp — Ihre digitale Nachbarschaft</p>
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
              <p style="margin:0; color:#999; font-size:11px;">QuartierApp — Ihre digitale Nachbarschaft</p>
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
Sie können ab sofort alle Funktionen von QuartierApp nutzen.

Zum Dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de"}/dashboard

—
QuartierApp — Ihre digitale Nachbarschaft`;
  }

  return `Guten Tag ${params.userName},

Leider konnte Ihre Adress-Verifizierung nicht bestätigt werden.
${params.adminNote ? `Hinweis: ${params.adminNote}` : ""}

Bitte wenden Sie sich an einen Admin, wenn Sie Fragen haben.

—
QuartierApp — Ihre digitale Nachbarschaft`;
}

// ============================================================
// Test-Report E-Mail
// ============================================================

interface TestReportSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  summary?: {
    total?: number;
    passed?: number;
    partial?: number;
    failed?: number;
    skipped?: number;
    open?: number;
    progressPercent?: number;
  };
  visited_routes?: { route: string; first_visit: string; visit_count: number }[];
  usability_rating: number | null;
  confidence_rating: number | null;
  final_feedback: string | null;
}

interface TestReportResult {
  test_point_id: string;
  status: string;
  comment: string | null;
  severity: string | null;
  issue_type: string | null;
  screenshot_url: string | null;
}

export async function sendTestReportEmail(params: {
  to: string;
  testerName: string;
  session: TestReportSession;
  results: TestReportResult[];
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "E-Mail-Service nicht konfiguriert" };
  }

  const { session, results, testerName } = params;
  const s = session.summary ?? {};
  const total = s.total ?? results.length;
  const passed = s.passed ?? results.filter(r => r.status === 'passed').length;
  const failed = s.failed ?? results.filter(r => r.status === 'failed').length;
  const partial = s.partial ?? results.filter(r => r.status === 'partial').length;
  const skipped = s.skipped ?? results.filter(r => r.status === 'skipped').length;
  const open = s.open ?? results.filter(r => r.status === 'open').length;
  const progressPercent = s.progressPercent ?? (total > 0 ? Math.round(((passed + partial + failed + skipped) / total) * 100) : 0);

  const visitedRoutes = session.visited_routes ?? [];
  const startedAt = new Date(session.started_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  const completedAt = session.completed_at ? new Date(session.completed_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '\u2014';

  const failedTests = results.filter(r => r.status === 'failed' || r.status === 'partial');

  const starEmoji = (rating: number | null) => {
    if (!rating) return '\u2014';
    return '\u2B50'.repeat(rating) + '\u2606'.repeat(5 - rating);
  };

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Testergebnis: ${testerName} \u2014 ${progressPercent}% abgeschlossen`,
      html: getTestReportHtml({ testerName, session, startedAt, completedAt, total, passed, partial, failed, skipped, open, progressPercent, visitedRoutes, failedTests, starEmoji }),
      text: getTestReportText({ testerName, startedAt, completedAt, total, passed, partial, failed, skipped, open, progressPercent, visitedRoutes, session }),
    });

    if (error) {
      console.error("Test-Report E-Mail fehlgeschlagen:", error);
      return { success: false, error: error.message };
    }

    console.log(`[email] Test-Report gesendet an ${params.to} fuer ${testerName}`);
    return { success: true };
  } catch (err) {
    console.error("Test-Report E-Mail Fehler:", err);
    return { success: false, error: "Netzwerkfehler beim E-Mail-Versand" };
  }
}

function getTestReportHtml(p: {
  testerName: string;
  session: TestReportSession;
  startedAt: string;
  completedAt: string;
  total: number;
  passed: number;
  partial: number;
  failed: number;
  skipped: number;
  open: number;
  progressPercent: number;
  visitedRoutes: { route: string; visit_count: number }[];
  failedTests: TestReportResult[];
  starEmoji: (r: number | null) => string;
}): string {
  const routeTags = p.visitedRoutes.map(r =>
    `<span style="display:inline-block;background:#f0faf4;color:#059669;padding:2px 8px;border-radius:4px;margin:2px;font-size:11px;">${escapeHtml(r.route)} (\u00D7${r.visit_count})</span>`
  ).join(' ');

  const failedRows = p.failedTests.map(r =>
    `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-family:monospace;">${escapeHtml(r.test_point_id)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;color:${r.status === 'failed' ? '#dc2626' : '#d97706'};">${r.status === 'failed' ? '\u2717' : '\u25D0'} ${escapeHtml(r.status)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${r.severity ? escapeHtml(r.severity) : '\u2014'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${r.comment ? escapeHtml(r.comment.slice(0, 100)) : '\u2014'}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">

<tr><td style="background-color:#2D3142;padding:24px 32px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:20px;">&#x1F9EA; Test-Ergebnis</h1>
  <p style="margin:8px 0 0;color:#a0a4b8;font-size:13px;">${escapeHtml(p.testerName)} \u2014 ${escapeHtml(p.startedAt)}</p>
</td></tr>

<tr><td style="padding:24px 32px;">
  <h2 style="margin:0 0 16px;color:#2D3142;font-size:16px;">Zusammenfassung</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0faf4;border-radius:12px;margin-bottom:16px;">
    <tr><td style="padding:16px 20px;text-align:center;">
      <p style="margin:0;color:#4CAF87;font-size:36px;font-weight:700;">${p.progressPercent}%</p>
      <p style="margin:4px 0 0;color:#666;font-size:12px;">Gesamtfortschritt</p>
    </td></tr>
  </table>
  <table width="100%" cellpadding="8" cellspacing="0" style="font-size:13px;color:#444;">
    <tr><td style="border-bottom:1px solid #eee;">Zeitraum</td><td style="border-bottom:1px solid #eee;text-align:right;">${escapeHtml(p.startedAt)} \u2014 ${escapeHtml(p.completedAt)}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;">Testpunkte gesamt</td><td style="border-bottom:1px solid #eee;text-align:right;">${p.total}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;color:#059669;">\u2713 Bestanden</td><td style="border-bottom:1px solid #eee;text-align:right;">${p.passed}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;color:#d97706;">\u25D0 Teilweise</td><td style="border-bottom:1px solid #eee;text-align:right;">${p.partial}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;color:#dc2626;">\u2717 Fehlgeschlagen</td><td style="border-bottom:1px solid #eee;text-align:right;">${p.failed}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;">\u23ED Übersprungen</td><td style="border-bottom:1px solid #eee;text-align:right;">${p.skipped}</td></tr>
    <tr><td>\u25CB Offen</td><td style="text-align:right;">${p.open}</td></tr>
  </table>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <h2 style="margin:0 0 12px;color:#2D3142;font-size:16px;">Besuchte Seiten (${p.visitedRoutes.length})</h2>
  <p style="margin:0;">${routeTags || '<em style="color:#999;">Keine Seiten erfasst</em>'}</p>
</td></tr>

${p.failedTests.length > 0 ? `
<tr><td style="padding:0 32px 24px;">
  <h2 style="margin:0 0 12px;color:#dc2626;font-size:16px;">Probleme (${p.failedTests.length})</h2>
  <table width="100%" cellpadding="6" cellspacing="0" style="font-size:12px;border:1px solid #eee;border-radius:8px;">
    <tr style="background:#f8f8fa;">
      <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Test</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Status</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Schwere</th>
      <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">Kommentar</th>
    </tr>
    ${failedRows}
  </table>
</td></tr>` : ''}

<tr><td style="padding:0 32px 24px;">
  <h2 style="margin:0 0 12px;color:#2D3142;font-size:16px;">Bewertungen</h2>
  <p style="margin:0 0 4px;font-size:13px;color:#444;">Benutzerfreundlichkeit: ${p.starEmoji(p.session.usability_rating)}</p>
  <p style="margin:0 0 4px;font-size:13px;color:#444;">Sicherheit: ${p.starEmoji(p.session.confidence_rating)}</p>
  ${p.session.final_feedback ? `<p style="margin:12px 0 0;padding:12px;background:#f8f8fa;border-radius:8px;font-size:13px;color:#444;line-height:1.5;"><em>"${escapeHtml(p.session.final_feedback)}"</em></p>` : ''}
</td></tr>

<tr><td style="background-color:#f8f8fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
  <p style="margin:0;color:#999;font-size:11px;">QuartierApp \u2014 Pilot-Test-Report<br>Session: ${escapeHtml(p.session.id.slice(0, 8))}</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function getTestReportText(p: {
  testerName: string;
  startedAt: string;
  completedAt: string;
  total: number;
  passed: number;
  partial: number;
  failed: number;
  skipped: number;
  open: number;
  progressPercent: number;
  visitedRoutes: { route: string }[];
  session: TestReportSession;
}): string {
  return `Test-Ergebnis: ${p.testerName}
Zeitraum: ${p.startedAt} \u2014 ${p.completedAt}
Fortschritt: ${p.progressPercent}%

Ergebnisse:
- Bestanden: ${p.passed}
- Teilweise: ${p.partial}
- Fehlgeschlagen: ${p.failed}
- \u00DCbersprungen: ${p.skipped}
- Offen: ${p.open}

Besuchte Seiten: ${p.visitedRoutes.map(r => r.route).join(', ') || 'Keine'}

Bewertungen:
- Benutzerfreundlichkeit: ${p.session.usability_rating ?? '\u2014'}/5
- Sicherheit: ${p.session.confidence_rating ?? '\u2014'}/5
${p.session.final_feedback ? `\nFeedback: "${p.session.final_feedback}"` : ''}

\u2014
QuartierApp \u2014 Pilot-Test-Report`;
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
