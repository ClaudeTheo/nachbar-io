// Strichzeichnung-Spinner (kreisender Stift-Kreis)
export function SketchSpinner({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="status"
      aria-label="Wird geladen..."
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-sketch-spinner"
      />
    </svg>
  );
}
