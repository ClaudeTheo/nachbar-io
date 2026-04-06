// app/api/trap/admin/config/route.ts
// Honeypot-Route: Fuer Scanner die /api/admin/config suchen
// Scoring passiert in security-middleware.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
