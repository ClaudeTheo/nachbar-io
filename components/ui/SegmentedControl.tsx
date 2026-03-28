"use client";

import { haptic } from "@/lib/haptics";

interface SegmentedControlProps {
  items: string[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ items, active, onChange, className = "" }: SegmentedControlProps) {
  const activeIdx = items.indexOf(active);

  function handleChange(value: string) {
    if (value === active) return;
    haptic("light");
    onChange(value);
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        className="relative flex rounded-xl p-1"
        style={{
          backgroundColor: "rgba(45, 49, 66, 0.06)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {/* Glassmorphism Sliding Indicator */}
        <div
          data-testid="segment-slider"
          className="absolute top-1 bottom-1 rounded-lg"
          style={{
            width: `calc(${100 / items.length}% - 4px)`,
            left: `calc(${(activeIdx * 100) / items.length}% + 2px)`,
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow:
              "0 1px 3px rgba(61, 61, 80, 0.06), " +
              "0 4px 12px rgba(61, 61, 80, 0.04), " +
              "inset 0 0.5px 0 rgba(255, 255, 255, 0.8)",
            transition:
              "left 350ms cubic-bezier(0.34, 1.56, 0.64, 1), " +
              "width 350ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {items.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={item === active}
            onClick={() => handleChange(item)}
            className="relative z-10 flex-1 rounded-lg py-2 text-center text-sm font-semibold"
            style={{
              color: item === active ? "#2D3142" : "rgba(45, 49, 66, 0.45)",
              transform: item === active ? "scale(1.03)" : "scale(1)",
              transition:
                "color 200ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
