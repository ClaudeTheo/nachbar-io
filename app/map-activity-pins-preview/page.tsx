import { notFound } from "next/navigation";

import { ActivityPinsMapPreviewClient } from "@/app/map-activity-pins-preview/ActivityPinsMapPreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function MapActivityPinsPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <ActivityPinsMapPreviewClient />;
}
