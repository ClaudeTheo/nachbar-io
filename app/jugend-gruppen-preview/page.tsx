import { notFound } from "next/navigation";

import { YouthGroupsSurface } from "@/modules/youth/components/YouthGroupsSurface";
import { isLocalUiPreviewEnabled } from "@/lib/local-ui-preview";

export default async function YouthGroupsPreviewPage() {
  if (!isLocalUiPreviewEnabled()) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-[#071923] px-4 pt-2">
      <YouthGroupsSurface />
    </main>
  );
}
