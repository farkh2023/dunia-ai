import { NextResponse } from "next/server";
import { deleteDocument } from "@/documents/indexer";
import { documentDeleteSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = documentDeleteSchema.parse(await request.json());
  await deleteDocument(payload.id);
  return NextResponse.json({ ok: true });
}
