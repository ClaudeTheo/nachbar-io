"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import { useExternalLink } from "@/components/ExternalLinkProvider";

interface ExternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "title"> {
  href: string;
  title?: string;
  children: ReactNode;
}

// Drop-in-Ersatz für <a href="..." target="_blank">
// Öffnet externe Links im In-App-Browser statt im neuen Tab
export function ExternalLink({
  href,
  title,
  children,
  className,
  ...anchorProps
}: ExternalLinkProps) {
  const { openExternal } = useExternalLink();

  // mailto: und tel: Links direkt durchreichen
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} className={className} {...anchorProps}>
        {children}
      </a>
    );
  }

  return (
    <a
      {...anchorProps}
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
