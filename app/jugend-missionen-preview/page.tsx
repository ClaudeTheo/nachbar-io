import { notFound } from "next/navigation";

import { YouthMissionsPreviewClient } from "@/app/jugend-missionen-preview/YouthMissionsPreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function JugendMissionenPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <YouthMissionsPreviewClient />;
}
