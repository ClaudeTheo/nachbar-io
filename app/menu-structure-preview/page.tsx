import { notFound } from "next/navigation";

import { MenuStructurePreviewClient } from "@/app/menu-structure-preview/MenuStructurePreviewClient";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function MenuStructurePreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return <MenuStructurePreviewClient />;
}
