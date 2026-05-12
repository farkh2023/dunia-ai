import { NextResponse } from "next/server";
import { z } from "zod";
import { memorySearchSchema } from "@/lib/validation";
import { deleteMemoryItem, searchMemory } from "@/memory/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = memorySearchSchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined
  });
  const memory = await searchMemory(payload.q, payload.tag);
  return NextResponse.json({ memory });
}

export async function DELETE(request: Request) {
  const payload = z.object({ id: z.string().min(1) }).parse(await request.json());
  await deleteMemoryItem(payload.id);
  return NextResponse.json({ ok: true });
}
