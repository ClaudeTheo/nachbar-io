"use client";

import type { Icon } from "@phosphor-icons/react";

interface CategoryIconProps {
  icon: Icon;
  bgColor: string;
  iconColor: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "h-8 w-8", icon: 16 },
  md: { container: "h-10 w-10", icon: 20 },
  lg: { container: "h-12 w-12", icon: 24 },
};

export function CategoryIcon({
  icon: PhosphorIcon,
  bgColor,
  iconColor,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const s = sizeMap[size];
  return (
    <div
      data-testid="category-icon"
      aria-hidden="true"
      className={`${s.container} ${bgColor} ${iconColor} flex items-center justify-center rounded-full shrink-0 ${className}`}
    >
      <PhosphorIcon size={s.icon} weight="duotone" />
    </div>
  );
}
