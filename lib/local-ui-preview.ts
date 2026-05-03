// lib/local-ui-preview.ts
// Lokale UI-Previews sind nur fuer Entwicklungs- und Testumgebungen gedacht.

export function isLocalUiPreviewEnabled() {
  return process.env.NODE_ENV !== "production";
}
