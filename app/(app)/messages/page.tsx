import { redirect } from "next/navigation";

// Schritt 3 (Chat-Unify): Legacy-Nachrichtenliste ist ein Redirect-Shim auf das
// kanonische /chat (reichere Liste inkl. Gruppen + Kontaktanfragen).
export default function MessagesRedirect() {
  redirect("/chat");
}
