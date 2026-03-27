import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/env-status
 *
 * Prüft welche Umgebungsvariablen gesetzt sind.
 * Gibt NUR Booleans zurück (true/false), NIE die eigentlichen Werte.
 * Nur für Admins.
 */
export async function GET() {
  const supabase = await createClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  // Env-Variablen prüfen (nur Präsenz, KEINE Werte!)
  const ENV_CHECKS = [
    // Supabase
    { label: "Supabase URL", key: "NEXT_PUBLIC_SUPABASE_URL", critical: true, group: "Supabase" },
    { label: "Supabase Anon Key", key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", critical: true, group: "Supabase" },
    { label: "Service Role Key", key: "SUPABASE_SERVICE_ROLE_KEY", critical: true, group: "Supabase" },
    // Push
    { label: "VAPID Public Key", key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", critical: false, group: "Push" },
    { label: "VAPID Private Key", key: "VAPID_PRIVATE_KEY", critical: false, group: "Push" },
    // KI
    { label: "Anthropic API Key", key: "ANTHROPIC_API_KEY", critical: false, group: "KI" },
    // Sicherheit
    { label: "Internal API Secret", key: "INTERNAL_API_SECRET", critical: true, group: "Sicherheit" },
    { label: "Cron Secret", key: "CRON_SECRET", critical: false, group: "Sicherheit" },
    // E-Mail
    { label: "Resend API Key", key: "RESEND_API_KEY", critical: false, group: "E-Mail" },
    // Care
    { label: "Care Encryption Key", key: "CARE_ENCRYPTION_KEY", critical: false, group: "Care-Modul" },
    // Allgemein
    { label: "Site URL", key: "NEXT_PUBLIC_SITE_URL", critical: false, group: "Allgemein" },
  ];

  const vars = ENV_CHECKS.map((check) => ({
    label: check.label,
    key: check.key,
    isSet: !!process.env[check.key],
    critical: check.critical,
    group: check.group,
  }));

  // Build-Info
  const buildInfo = {
    nodeVersion: process.version,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null,
    commitMessage: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE || null,
    region: process.env.VERCEL_REGION || null,
  };

  return NextResponse.json({ vars, buildInfo, timestamp: new Date().toISOString() });
}
