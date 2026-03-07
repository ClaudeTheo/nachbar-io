"use client";

// CSS-only Konfetti — keine externen Abhaengigkeiten
const COLORS = ["#4CAF87", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444"];

export function ConfettiEffect({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = Array.from({ length: 35 }).map((_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * -400 - 100,
    r: Math.random() * 720 - 360,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 400,
    size: Math.random() * 6 + 4,
    shape: i % 3 === 0 ? "rounded-full" : "rounded-sm",
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute left-1/2 top-1/2 ${p.shape}`}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            "--x": `${p.x}px`,
            "--y": `${p.y}px`,
            "--r": `${p.r}deg`,
            animation: `confetti-burst 1.8s ease-out ${p.delay}ms forwards`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
