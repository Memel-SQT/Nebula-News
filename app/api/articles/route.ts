import { NextRequest, NextResponse } from "next/server";
import { isThemeKey, type Language, type Region } from "@/types";
import { getArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const theme = params.get("theme");

  const result = await getArticles({
    region: (params.get("region") as Region) || undefined,
    theme: isThemeKey(theme) ? theme : undefined,
    language: (params.get("language") as Language) || undefined,
    q: params.get("q") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    page: params.get("page") ? Number(params.get("page")) : undefined,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : undefined,
  });

  return NextResponse.json(result);
}
