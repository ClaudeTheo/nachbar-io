// Linkify — macht URLs in Text klickbar
// Erkennt http(s)://-URLs und wandelt sie in tippbare Links um

import { Fragment } from "react";

// Erkennt URLs: http(s)://... bis zum naechsten Whitespace oder Satzende
const URL_REGEX =
  /https?:\/\/[^\s<>"')\]},;!?]+(?:\([^\s<>"')\]},;!?]*\))?[^\s<>"')\]},;!?.]*[^\s<>"')\]},;!?.,:)]/g;

interface LinkifyProps {
  text: string;
}

// Wandelt URLs in <a>-Tags um, Rest bleibt als Text
export function Linkify({ text }: LinkifyProps) {
  const parts: (string | { url: string; key: number })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // Regex zuruecksetzen
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Text vor dem Link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ url: match[0], key: key++ });
    lastIndex = match.index + match[0].length;
  }

  // Rest-Text nach dem letzten Link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Kein Link gefunden — reinen Text zurueckgeben
  if (parts.length === 1 && typeof parts[0] === "string") {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <a
            key={`link-${part.key}`}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-quartier-green underline break-all"
          >
            {part.url}
          </a>
        ),
      )}
    </>
  );
}
