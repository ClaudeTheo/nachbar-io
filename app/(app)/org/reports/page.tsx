// app/(app)/org/reports/page.tsx
// Server-Component-Wrapper: verhindert statisches Pre-Rendering (Auth-pflichtig)

import OrgReportsClient from "./OrgReportsClient";

export const dynamic = "force-dynamic";

export default function OrgReportsPage() {
  return <OrgReportsClient />;
}
