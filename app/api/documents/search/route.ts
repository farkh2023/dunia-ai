import { NextResponse } from "next/server";
import { searchDocuments } from "@/documents/search";
import { documentSearchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = documentSearchSchema.parse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined
  });

  const results = await searchDocuments(payload.q, { limit: payload.limit });
  return NextResponse.json({ results });
}
