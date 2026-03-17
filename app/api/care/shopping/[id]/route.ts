// app/api/care/shopping/[id]/route.ts
// Nachbar.io — Einkaufshilfe: Status-Uebergaenge (PATCH), Loeschen (DELETE)

import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

// Gueltige Status-Uebergaenge
const TRANSITIONS: Record<string, { from: string[]; field_updates: Record<string, unknown> }> = {
  claim: {
    from: ['open'],
    field_updates: { status: 'claimed' },
  },
  unclaim: {
    from: ['claimed'],
    field_updates: { status: 'open', claimed_by: null, claimed_at: null },
  },
  shopping: {
    from: ['claimed'],
    field_updates: { status: 'shopping' },
  },
  deliver: {
    from: ['claimed', 'shopping'],
    field_updates: { status: 'delivered' },
  },
  confirm: {
    from: ['delivered'],
    field_updates: { status: 'confirmed' },
  },
  cancel: {
    from: ['open', 'claimed'],
    field_updates: { status: 'cancelled' },
  },
};

// PATCH /api/care/shopping/[id] — Status-Aenderung oder Items aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: { action?: string; items?: { name: string; quantity?: string; checked?: boolean }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Bestehende Anfrage laden
  const { data: existing, error: fetchError } = await supabase
    .from('care_shopping_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    if (fetchError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Einkaufsanfrage nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Einkaufsanfrage konnte nicht geladen werden' }, { status: 500 });
  }

  const updates: Record<string, unknown> = {};

  // Items-Update (optional, kann zusammen mit action gesendet werden)
  if (body.items) {
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
      return NextResponse.json({ error: 'Items: 1-30 Artikel erforderlich' }, { status: 400 });
    }
    for (const item of body.items) {
      if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
        return NextResponse.json({ error: 'Jeder Artikel muss einen Namen haben' }, { status: 400 });
      }
      if (item.name.length > 200) {
        return NextResponse.json({ error: 'Artikelname darf maximal 200 Zeichen lang sein' }, { status: 400 });
      }
    }
    updates.items = body.items.map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity?.trim() ?? '',
      checked: item.checked ?? false,
    }));
  }

  // Status-Uebergang (wenn action angegeben)
  if (body.action) {
    const transition = TRANSITIONS[body.action];
    if (!transition) {
      return NextResponse.json({
        error: `Ungueltige Aktion: ${body.action}. Erlaubt: ${Object.keys(TRANSITIONS).join(', ')}`,
      }, { status: 400 });
    }

    // Aktueller Status pruefen
    if (!transition.from.includes(existing.status)) {
      return NextResponse.json({
        error: `Aktion '${body.action}' ist im Status '${existing.status}' nicht moeglich`,
      }, { status: 409 });
    }

    // Berechtigungspruefung
    const isRequester = existing.requester_id === user.id;
    const isClaimer = existing.claimed_by === user.id;

    // confirm und cancel: nur Ersteller
    if (['confirm', 'cancel'].includes(body.action) && !isRequester) {
      return NextResponse.json({ error: 'Nur der Ersteller kann diese Aktion ausfuehren' }, { status: 403 });
    }

    // unclaim, shopping, deliver: nur der Uebernehmende
    if (['unclaim', 'shopping', 'deliver'].includes(body.action) && !isClaimer) {
      return NextResponse.json({ error: 'Nur die uebernehmende Person kann diese Aktion ausfuehren' }, { status: 403 });
    }

    // Feld-Updates aus Transition uebernehmen
    Object.assign(updates, transition.field_updates);

    // Zusaetzliche Felder je nach Aktion
    if (body.action === 'claim') {
      updates.claimed_by = user.id;
      updates.claimed_at = new Date().toISOString();
    } else if (body.action === 'deliver') {
      updates.delivered_at = new Date().toISOString();
    } else if (body.action === 'confirm') {
      updates.confirmed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine aenderbaren Felder angegeben' }, { status: 400 });
  }

  // Update ausfuehren
  const { data: updated, error: updateError } = await supabase
    .from('care_shopping_requests')
    .update(updates)
    .eq('id', id)
    .select('*, requester:users!requester_id(display_name), claimer:users!claimed_by(display_name)')
    .single();

  if (updateError || !updated) {
    console.error('[care/shopping] PATCH Update-Fehler:', updateError);
    return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: existing.requester_id,
    actorId: user.id,
    eventType: 'visit_logged',
    referenceType: 'care_shopping_requests',
    referenceId: id,
    metadata: {
      action: body.action ?? 'items_updated',
      from_status: existing.status,
      to_status: updated.status,
    },
  }).catch(() => {});

  // Push-Benachrichtigungen bei bestimmten Aktionen
  if (body.action === 'claim') {
    // Ersteller benachrichtigen, dass jemand uebernommen hat
    await sendCareNotification(supabase, {
      userId: existing.requester_id,
      type: 'care_sos_response',
      title: 'Einkaufshilfe uebernommen',
      body: 'Jemand hat Ihre Einkaufsanfrage uebernommen.',
      referenceId: id,
      referenceType: 'care_shopping_requests',
      url: '/care/shopping',
      channels: ['push', 'in_app'],
    }).catch(() => {});
  } else if (body.action === 'deliver') {
    // Ersteller benachrichtigen, dass Lieferung erfolgt ist
    await sendCareNotification(supabase, {
      userId: existing.requester_id,
      type: 'care_sos_response',
      title: 'Einkauf geliefert',
      body: 'Ihr Einkauf wurde als geliefert markiert. Bitte bestaetigen Sie den Empfang.',
      referenceId: id,
      referenceType: 'care_shopping_requests',
      url: '/care/shopping',
      channels: ['push', 'in_app'],
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}

// DELETE /api/care/shopping/[id] — Offene Anfrage loeschen
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  // Anfrage laden
  const { data: existing, error: fetchError } = await supabase
    .from('care_shopping_requests')
    .select('requester_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    if (fetchError?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Einkaufsanfrage nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Einkaufsanfrage konnte nicht geladen werden' }, { status: 500 });
  }

  // Nur Ersteller darf loeschen
  if (existing.requester_id !== user.id) {
    return NextResponse.json({ error: 'Nur der Ersteller kann diese Anfrage loeschen' }, { status: 403 });
  }

  // Nur offene Anfragen loeschen
  if (existing.status !== 'open') {
    return NextResponse.json({ error: 'Nur offene Anfragen koennen geloescht werden' }, { status: 409 });
  }

  const { error: deleteError } = await supabase
    .from('care_shopping_requests')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[care/shopping] DELETE Fehler:', deleteError);
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
  }

  // Audit-Log
  await writeAuditLog(supabase, {
    seniorId: user.id,
    actorId: user.id,
    eventType: 'visit_logged',
    referenceType: 'care_shopping_requests',
    referenceId: id,
    metadata: { action: 'deleted' },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
