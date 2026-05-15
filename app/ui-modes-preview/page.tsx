import { notFound } from "next/navigation";

import { UiModesPreviewClient } from "@/app/ui-modes-preview/UiModesPreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function UiModesPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <UiModesPreviewClient />;
}
