// Nachbar.io — API: Anamnese-Bogen per Token laden + ausfüllen
// GET: Formular-Felder laden (kein Login nötig, Token-basiert)
// POST: Antworten speichern (verschlüsselt via AES-256-GCM)

import { getAdminSupabase } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { encryptField } from "@/lib/care/field-encryption";

interface RouteContext {
  params: Promise<{ token: string }>;
}

// GET: Formular-Felder laden (kein Login nötig)
export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Ungültiger Token." }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Formular mit Vorlage laden
  const { data: form, error } = await supabase
    .from("anamnesis_forms")
    .select("id, status, expires_at, template_id")
    .eq("access_token", token)
    .single();

  if (error || !form) {
    return NextResponse.json(
      { error: "Bogen nicht gefunden." },
      { status: 404 },
    );
  }

  if (form.status !== "pending") {
    return NextResponse.json(
      { error: "Dieser Bogen wurde bereits ausgefüllt." },
      { status: 410 },
    );
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Dieser Bogen ist abgelaufen." },
      { status: 410 },
    );
  }

  // Vorlage laden (Felder, Name, Beschreibung)
  let templateData = null;
  if (form.template_id) {
    const { data: tpl } = await supabase
      .from("anamnesis_templates")
      .select("name, description, fields")
      .eq("id", form.template_id)
      .single();
    templateData = tpl;
  }

  return NextResponse.json({
    form_id: form.id,
    template_name: templateData?.name ?? "Anamnese-Bogen",
    template_description: templateData?.description ?? null,
    fields: templateData?.fields ?? [],
  });
}

// POST: Antworten speichern (verschlüsselt)
export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Ungültiger Token." }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Bogen laden und prüfen
  const { data: form, error: formError } = await supabase
    .from("anamnesis_forms")
    .select("id, status, expires_at")
    .eq("access_token", token)
    .single();

  if (formError || !form) {
    return NextResponse.json(
      { error: "Bogen nicht gefunden." },
      { status: 404 },
    );
  }

  if (form.status !== "pending") {
    return NextResponse.json(
      { error: "Dieser Bogen wurde bereits ausgefüllt." },
      { status: 410 },
    );
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Dieser Bogen ist abgelaufen." },
      { status: 410 },
    );
  }

  // Body parsen
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body." },
      { status: 400 },
    );
  }

  const { answers } = body;

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Antworten müssen ein Array sein." },
      { status: 400 },
    );
  }

  // Antworten verschlüsseln (AES-256-GCM)
  const encrypted = encryptField(JSON.stringify(answers));

  if (!encrypted) {
    return NextResponse.json(
      { error: "Verschlüsselung fehlgeschlagen." },
      { status: 500 },
    );
  }

  // Bogen aktualisieren
  const { error: updateError } = await supabase
    .from("anamnesis_forms")
    .update({
      form_data_encrypted: encrypted,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", form.id)
    .eq("status", "pending"); // Optimistic Lock: Nur wenn noch pending

  if (updateError) {
    console.error("Anamnese-Submit Fehler:", updateError);
    return NextResponse.json(
      { error: "Bogen konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Vielen Dank! Ihr Anamnese-Bogen wurde erfolgreich eingereicht.",
  });
}
