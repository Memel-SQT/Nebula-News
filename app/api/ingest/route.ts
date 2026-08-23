import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingestion/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Triggers a full ingestion pass across all configured sources.
 *
 * - GET is what Vercel Cron calls (see vercel.json). Vercel signs cron
 *   requests with `Authorization: Bearer $CRON_SECRET`, so this reuses
 *   INGEST_SECRET for that check.
 * - POST is for manual/local triggering with the same secret, either as a
 *   Bearer token or a `?secret=` query param.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true; // no secret configured: local dev convenience

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runIngestion();
  return NextResponse.json({ ok: true, summary });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
