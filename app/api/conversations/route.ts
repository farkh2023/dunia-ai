import { NextResponse } from "next/server";
import { listConversations } from "@/memory/store";

export const runtime = "nodejs";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}
