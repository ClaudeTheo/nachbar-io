"use client";

import { SKILL_CATEGORIES } from "@/lib/constants";

interface SlideSkillsProps {
  selectedSkills: string[];
  onToggle: (skillId: string) => void;
}

export function SlideSkills({ selectedSkills, onToggle }: SlideSkillsProps) {
  return (
    <div className="flex flex-col items-center text-center px-4">
      <div className="text-5xl mb-4">🤝</div>
      <h2 className="text-xl font-bold text-anthrazit mb-2">
        Was können Sie Ihren Nachbarn anbieten?
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Tippen Sie an, was auf Sie zutrifft. Sie können dies jederzeit in den Einstellungen ändern.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {SKILL_CATEGORIES.filter(c => c.id !== 'other').map((cat) => {
          const isSelected = selectedSkills.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className={`flex items-center gap-2 rounded-xl px-4 min-h-[80px] text-left font-medium transition-all ${
                isSelected
                  ? "bg-quartier-green text-white ring-2 ring-quartier-green"
                  : "bg-white text-anthrazit border-2 border-border hover:border-quartier-green"
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-sm leading-tight">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
