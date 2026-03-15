import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCareNotification } from '@/lib/care/notifications';

export const dynamic = 'force-dynamic';

// Vercel Cron: Every hour — reminds quarter about open shopping requests due tomorrow
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: urgentRequests } = await adminSupabase
    .from('care_shopping_requests')
    .select('id, requester_id, items, due_date, quarter_id')
    .eq('status', 'open')
    .eq('due_date', tomorrowStr);

  let notified = 0;

  if (urgentRequests && urgentRequests.length > 0) {
    for (const shoppingReq of urgentRequests) {
      const { data: members } = await adminSupabase
        .from('household_members')
        .select('user_id, households!inner(quarter_id)')
        .eq('households.quarter_id', shoppingReq.quarter_id)
        .neq('user_id', shoppingReq.requester_id);

      if (members) {
        for (const member of members.slice(0, 10)) {
          await sendCareNotification(adminSupabase, {
            userId: member.user_id,
            type: 'sos_triggered',
            title: 'Einkaufshilfe gesucht',
            body: `Ein Nachbar braucht Hilfe beim Einkauf (${shoppingReq.items.length} Artikel, faellig morgen).`,
            referenceId: shoppingReq.id,
            referenceType: 'shopping_request',
            url: '/care/shopping',
            channels: ['push', 'in_app'],
          });
          notified++;
        }
      }
    }
  }

  await adminSupabase.from('cron_heartbeats').insert({
    job_name: 'shopping_reminder',
    status: 'ok',
    metadata: { urgentCount: urgentRequests?.length || 0, notified },
  });

  return NextResponse.json({ ok: true, urgent: urgentRequests?.length || 0, notified });
}
