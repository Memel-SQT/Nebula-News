import { NextResponse } from "next/server";
import { getBriefingToday } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET() {
  const briefing = await getBriefingToday();
  return NextResponse.json(briefing);
}
