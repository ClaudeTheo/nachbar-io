import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCareNotification } from '@/lib/care/notifications';

export const dynamic = 'force-dynamic';

// Vercel Cron: Every 2 hours — reminds quarter about urgent open tasks older than 4h
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: urgentTasks } = await adminSupabase
    .from('care_tasks')
    .select('id, creator_id, title, quarter_id')
    .eq('status', 'open')
    .eq('urgency', 'urgent')
    .lt('created_at', fourHoursAgo);

  let notified = 0;

  if (urgentTasks && urgentTasks.length > 0) {
    for (const task of urgentTasks) {
      const { data: members } = await adminSupabase
        .from('household_members')
        .select('user_id, households!inner(quarter_id)')
        .eq('households.quarter_id', task.quarter_id)
        .neq('user_id', task.creator_id);

      if (members) {
        for (const member of members.slice(0, 10)) {
          await sendCareNotification(adminSupabase, {
            userId: member.user_id,
            type: 'care_sos',
            title: 'Dringende Hilfe gesucht',
            body: `"${task.title}" — Ein Nachbar braucht dringend Hilfe!`,
            referenceId: task.id,
            referenceType: 'care_task',
            url: '/care/tasks',
            channels: ['push', 'in_app'],
          });
          notified++;
        }
      }
    }
  }

  await adminSupabase.from('cron_heartbeats').insert({
    job_name: 'task_reminder',
    status: 'ok',
    metadata: { urgentCount: urgentTasks?.length || 0, notified },
  });

  return NextResponse.json({ ok: true, urgent: urgentTasks?.length || 0, notified });
}
