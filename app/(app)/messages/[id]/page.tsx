import { redirect } from "next/navigation";

// Schritt 3 (Chat-Unify): Legacy-Detailseite ist ein Redirect-Shim auf das
// kanonische, medienfaehige /chat/[id]. Server-Component mit async params (Next 16).
export default async function MessagesIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/chat/${id}`);
}
