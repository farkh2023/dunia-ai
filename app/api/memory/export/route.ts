import { exportMemory } from "@/memory/store";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(await exportMemory(), {
    headers: {
      "Content-Disposition": `attachment; filename="dunia-memory-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}
