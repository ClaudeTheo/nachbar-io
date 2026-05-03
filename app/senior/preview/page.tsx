import { notFound } from "next/navigation";
import { SeniorLocalPreviewClient } from "@/app/senior/preview/SeniorLocalPreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function SeniorLocalPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <SeniorLocalPreviewClient />;
}
