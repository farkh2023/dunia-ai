import { NextResponse } from "next/server";
import { completeWithAgent } from "@/lib/ai";
import { chatRequestSchema } from "@/lib/validation";
import { withMemoryContext } from "@/memory/rag";
import {
  getRecentMessages,
  rememberConversationTurn,
  saveAssistantMessage,
  saveUserMessage
} from "@/memory/store";

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
    const recentMessages = await getRecentMessages(conversationId);
    const { messages, memories } = await withMemoryContext({
      query: userContent,
      messages: recentMessages,
      limit: 5
    });
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

    await rememberConversationTurn({
      conversationId,
      userContent,
      assistantContent: completion.content,
      agentId: payload.agentId
    });

    return NextResponse.json({
      conversationId,
      memoryContext: memories.map((memory) => ({
        id: memory.memoryItemId,
        title: memory.title,
        score: memory.score
      })),
      ...completion
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
