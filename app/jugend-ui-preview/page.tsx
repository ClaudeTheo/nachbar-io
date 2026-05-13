import { notFound } from "next/navigation";

import { YouthLocalPreviewClient } from "@/app/jugend-ui-preview/YouthLocalPreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function YouthUiPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <YouthLocalPreviewClient />;
}
