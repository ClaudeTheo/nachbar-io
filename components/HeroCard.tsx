"use client";

interface HeroCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HeroCard({ children, className = "" }: HeroCardProps) {
  return (
    <div
      data-testid="hero-card"
      className={`rounded-2xl bg-gradient-to-br from-quartier-green/10 via-quartier-green/5 to-transparent p-6 shadow-hero ${className}`}
    >
      {children}
    </div>
  );
}
