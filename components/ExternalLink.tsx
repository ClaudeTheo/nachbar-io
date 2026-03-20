"use client";

import { useExternalLink } from "@/components/ExternalLinkProvider";

interface ExternalLinkProps {
  href: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

// Drop-in-Ersatz fuer <a href="..." target="_blank">
// Oeffnet externe Links im In-App-Browser statt im neuen Tab
export function ExternalLink({ href, title, children, className }: ExternalLinkProps) {
  const { openExternal } = useExternalLink();

  // mailto: und tel: Links direkt durchreichen
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={() => openExternal(href, title)}
      className={className}
      type="button"
    >
      {children}
    </button>
  );
}
