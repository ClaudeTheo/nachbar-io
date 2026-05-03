import { notFound } from "next/navigation";
import { CareConsentLocalPreviewClient } from "@/app/(app)/care/consent/preview/CareConsentLocalPreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function CareConsentLocalPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <CareConsentLocalPreviewClient />;
}
