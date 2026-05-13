import { NextResponse } from "next/server";
import { listDocuments } from "@/documents/indexer";

export const runtime = "nodejs";

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents });
}
