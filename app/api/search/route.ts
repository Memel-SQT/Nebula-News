import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchArticles(q);
  return NextResponse.json({ query: q, results });
}
