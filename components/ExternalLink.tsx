"use client";

import { useExternalLink } from "@/components/ExternalLinkProvider";

interface ExternalLinkProps {
  href: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

// Drop-in-Ersatz für <a href="..." target="_blank">
// Öffnet externe Links im In-App-Browser statt im neuen Tab
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        event.preventDefault();
        openExternal(href, title);
      }}
      className={className}
    >
      {children}
    </a>
  );
}
