import { listWarnings } from "@/lib/integrations/__shared__/list-warnings";

export const dynamic = "force-dynamic";

export async function GET() {
  return listWarnings("nina");
}
