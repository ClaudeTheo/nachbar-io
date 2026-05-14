// modules/youth/components/TaskCard.tsx
// Jugend-Modul: Aufgaben-Karte
import {
  CalendarDays,
  Handshake,
  Leaf,
  Laptop,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_CONFIG = {
  technik: {
    label: "Technik",
    icon: Laptop,
    color: "bg-cyan-300/13 text-cyan-100 ring-cyan-100/25",
  },
  garten: {
    label: "Garten",
    icon: Leaf,
    color: "bg-lime-300/14 text-lime-100 ring-lime-100/25",
  },
  begleitung: {
    label: "Begleitung",
    icon: Handshake,
    color: "bg-amber-300/14 text-amber-100 ring-amber-100/25",
  },
  digital: {
    label: "Digital",
    icon: Smartphone,
    color: "bg-sky-300/13 text-sky-100 ring-sky-100/25",
  },
  event: {
    label: "Event",
    icon: CalendarDays,
    color: "bg-rose-300/13 text-rose-100 ring-rose-100/25",
  },
} as const satisfies Record<
  string,
  { label: string; icon: LucideIcon; color: string }
>;

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
  const Icon = cat.icon;

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-[20px] border border-white/12 bg-white/[0.075] p-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-100/36 hover:bg-white/[0.11]"
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="line-clamp-2 font-bold text-white">{title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cat.color}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {cat.label}
            </span>
            {estimatedMinutes && (
              <span className="text-xs font-medium text-cyan-50/58">~{estimatedMinutes} Min.</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-lime-200">{points} Punkte</p>
          <p className="text-[11px] font-semibold leading-tight text-cyan-50/58">
            ohne Geldwert
          </p>
          {status === 'completed' && (
            <span className="text-xs font-semibold text-lime-100">Erledigt</span>
          )}
          {status === 'accepted' && (
            <span className="text-xs font-semibold text-cyan-100">In Arbeit</span>
          )}
        </div>
      </div>
    </button>
  );
}
