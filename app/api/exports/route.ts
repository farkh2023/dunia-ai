import { NextResponse } from "next/server";
import { toJson, toMarkdown, toPdf } from "@/exports/exporters";
import { exportRequestSchema } from "@/lib/validation";
import { getConversation } from "@/memory/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = exportRequestSchema.parse(await request.json());
  const conversation = await getConversation(payload.conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  if (payload.format === "json") {
    return new Response(toJson(conversation), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${conversation.id}.json"`
      }
    });
  }

  if (payload.format === "pdf") {
    return new Response(Buffer.from(toPdf(conversation)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${conversation.id}.pdf"`
      }
    });
  }

  return new Response(toMarkdown(conversation), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${conversation.id}.md"`
    }
  });
}
