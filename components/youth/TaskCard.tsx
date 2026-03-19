// components/youth/TaskCard.tsx
// Jugend-Modul: Aufgaben-Karte

const CATEGORY_CONFIG = {
  technik: { label: 'Technik', icon: '💻', color: 'bg-blue-100 text-blue-700' },
  garten: { label: 'Garten', icon: '🌱', color: 'bg-green-100 text-green-700' },
  begleitung: { label: 'Begleitung', icon: '🤝', color: 'bg-amber-100 text-amber-700' },
  digital: { label: 'Digital', icon: '📱', color: 'bg-purple-100 text-purple-700' },
  event: { label: 'Event', icon: '🎉', color: 'bg-pink-100 text-pink-700' },
} as const;

type Category = keyof typeof CATEGORY_CONFIG;

interface TaskCardProps {
  title: string;
  category: Category;
  points: number;
  estimatedMinutes?: number;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  onClick?: () => void;
}

export function TaskCard({ title, category, points, estimatedMinutes, status, onClick }: TaskCardProps) {
  const cat = CATEGORY_CONFIG[category];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-green-400 transition-colors"
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-anthrazit line-clamp-2">{title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}>
              <span aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </span>
            {estimatedMinutes && (
              <span className="text-xs text-gray-500">~{estimatedMinutes} Min.</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-green-600">{points} Punkte</p>
          {status === 'completed' && (
            <span className="text-xs text-green-600">Erledigt ✓</span>
          )}
          {status === 'accepted' && (
            <span className="text-xs text-blue-600">In Arbeit</span>
          )}
        </div>
      </div>
    </button>
  );
}
