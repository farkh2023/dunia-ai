import { NextResponse } from "next/server";
import { completeWithAgent } from "@/lib/ai";
import { chatRequestSchema } from "@/lib/validation";
import { getRecentMessages, saveAssistantMessage, saveUserMessage } from "@/memory/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = chatRequestSchema.parse(await request.json());
    const attachmentText = payload.attachments
      .map((file) => `\n\n[Fichier: ${file.name}]\n${file.content}`)
      .join("");
    const userContent = `${payload.message}${attachmentText}`;

    const conversationId = await saveUserMessage({
      conversationId: payload.conversationId,
      agentId: payload.agentId,
      provider: payload.provider,
      model: payload.model ?? "auto",
      content: userContent
    });
    const messages = await getRecentMessages(conversationId);
    const completion = await completeWithAgent({
      agentId: payload.agentId,
      provider: payload.provider,
      model: payload.model,
      messages
    });

    await saveAssistantMessage({
      conversationId,
      content: completion.content,
      provider: completion.provider,
      model: completion.model
    });

    return NextResponse.json({ conversationId, ...completion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
