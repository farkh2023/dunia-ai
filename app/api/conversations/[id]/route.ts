import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConversation } from "@/memory/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }
  return NextResponse.json({ conversation });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
