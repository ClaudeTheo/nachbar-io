"use client";

/**
 * SeniorButton — Große, accessible Touch-Targets für den Seniorenmodus
 *
 * Design-Regeln:
 * - Minimum 80px Höhe
 * - Schriftgröße 24px (1.5rem)
 * - Hoher Kontrast (min. 4.5:1)
 * - Nur Taps, kein Swipen/Long-Press
 * - Visuelles Feedback bei Touch
 */

interface SeniorButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "success" | "alert" | "neutral";
  className?: string;
}

export function SeniorButton({
  icon,
  label,
  onClick,
  variant = "neutral",
  className = "",
}: SeniorButtonProps) {
  const variantStyles = {
    primary: "bg-quartier-green text-white hover:bg-quartier-green-dark active:bg-quartier-green-dark",
    success: "bg-success-green text-white hover:bg-green-600 active:bg-green-700",
    alert: "bg-alert-amber text-white hover:bg-amber-600 active:bg-amber-700",
    neutral: "bg-white text-anthrazit border-2 border-gray-200 hover:bg-gray-50 active:bg-gray-100",
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex w-full items-center gap-4 rounded-xl px-6 shadow-sm
        transition-all duration-150
        senior-button
        focus:ring-4 focus:ring-quartier-green/50 focus:outline-none
        ${variantStyles[variant]}
        ${className}
      `}
      style={{ minHeight: "80px" }}
    >
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-left font-bold" style={{ fontSize: "1.5rem" }}>
        {label}
      </span>
    </button>
  );
}
