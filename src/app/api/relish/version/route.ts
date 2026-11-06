import { NextResponse } from "next/server";
import { liveBuild } from "@/lib/relish/version";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(
    { build: liveBuild() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
