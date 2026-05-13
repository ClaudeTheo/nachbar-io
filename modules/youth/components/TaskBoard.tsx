// modules/youth/components/TaskBoard.tsx
// Jugend-Modul: Aufgaben-Board mit Kategorie-Filter
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TaskCard } from './TaskCard';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { key: 'all', label: 'Alle' },
  { key: 'technik', label: 'Technik' },
  { key: 'garten', label: 'Garten' },
  { key: 'begleitung', label: 'Begleitung' },
  { key: 'digital', label: 'Digital' },
  { key: 'event', label: 'Event' },
] as const;

interface Task {
  id: string;
  title: string;
  category: 'technik' | 'garten' | 'begleitung' | 'digital' | 'event';
  points_reward: number;
  estimated_minutes: number | null;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
}

export function TaskBoard({ quarterId }: { quarterId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadTasks() {
      const supabase = createClient();
      let query = supabase
        .from('youth_tasks')
        .select('id, title, category, points_reward, estimated_minutes, status')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);

      if (quarterId) {
        query = query.eq('quarter_id', quarterId);
      }

      const { data } = await query;
      setTasks((data as Task[]) || []);
      setLoading(false);
    }

    loadTasks();
  }, [quarterId]);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);

  if (loading) {
    return <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-[20px] bg-white/10" />)}
    </div>;
  }

  return (
    <div className="space-y-4">
      {/* Kategorie-Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            aria-pressed={filter === cat.key}
            className={`min-h-10 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition ${
              filter === cat.key
                ? 'bg-lime-300 text-slate-950 shadow-[0_0_24px_rgba(190,242,100,0.28)]'
                : 'border border-white/12 bg-white/[0.07] text-cyan-50/72 hover:border-cyan-100/36 hover:text-white'
            }`}
            type="button"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Aufgaben-Liste */}
      {filtered.length === 0 ? (
        <p className="rounded-[20px] border border-white/12 bg-white/[0.06] px-4 py-8 text-center text-sm font-medium text-cyan-50/64">
          Keine Aufgaben gefunden.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              title={task.title}
              category={task.category}
              points={task.points_reward}
              estimatedMinutes={task.estimated_minutes || undefined}
              status={task.status}
              onClick={() => router.push(`/jugend/aufgaben/${task.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
