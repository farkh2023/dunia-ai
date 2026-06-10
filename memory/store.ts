import { prisma } from "@/lib/prisma";
import { estimateTokens, makeConversationTitle, safeJsonArray } from "@/lib/utils";
import type { AiMessage } from "@/lib/ai";
import { chunkText } from "@/memory/chunker";
import { embedText, serializeEmbedding } from "@/memory/embeddings";
import { searchRelevantMemory } from "@/memory/search";
import { extractAndStoreMemories } from "@/memory/extraction";

export async function listConversations() {
  const rows = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  });
  return rows.map((row) => ({ ...row, tags: safeJsonArray(row.tags) }));
}

export async function getConversation(id: string) {
  const row = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  });
  return row ? { ...row, tags: safeJsonArray(row.tags) } : null;
}

export async function saveUserMessage(input: {
  conversationId?: string;
  agentId: string;
  provider: string;
  model: string;
  content: string;
}) {
  const conversation =
    input.conversationId ??
    (
      await prisma.conversation.create({
        data: {
          title: makeConversationTitle(input.content),
          agentId: input.agentId,
          provider: input.provider,
          model: input.model
        }
      })
    ).id;

  await prisma.message.create({
    data: {
      conversationId: conversation,
      role: "user",
      content: input.content,
      tokenEstimate: estimateTokens(input.content)
    }
  });

  return conversation;
}

export async function saveAssistantMessage(input: {
  conversationId: string;
  content: string;
  provider: string;
  model: string;
}) {
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: "assistant",
        content: input.content,
        tokenEstimate: estimateTokens(input.content)
      }
    }),
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { provider: input.provider, model: input.model }
    })
  ]);
}

export async function rememberConversationTurn(input: {
  conversationId: string;
  userContent: string;
  assistantContent: string;
  agentId: string;
}) {
  const combined = [
    `Utilisateur: ${input.userContent}`,
    "",
    `Assistant: ${input.assistantContent}`
  ].join("\n");

  // On essaie d'extraire des faits sémantiques si possible
  const factCount = await extractAndStoreMemories(input);
  
  // Si aucun fait n'a été extrait mais que c'est important, on garde le tour complet
  if (factCount === 0 && shouldRemember(input.userContent, input.assistantContent)) {
    return createMemoryItem({
      title: makeConversationTitle(input.userContent),
      content: combined,
      source: `conversation:${input.conversationId}`,
      tags: ["conversation", input.agentId],
      importance: input.userContent.length > 500 ? 4 : 3,
      type: "conversation"
    });
  }

  return null;
}

export async function getRecentMessages(conversationId: string, take = 12): Promise<AiMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take
  });
  return messages
    .reverse()
    .map((message) => ({ role: toAiRole(message.role), content: message.content }));
}

function toAiRole(role: string): AiMessage["role"] {
  if (role === "assistant" || role === "system" || role === "user") {
    return role;
  }
  return "user";
}

export async function searchMemory(query?: string, tag?: string) {
  const where: { tags?: { contains: string } } = {};
  if (tag) {
    where.tags = { contains: tag };
  }

  if (query?.trim()) {
    const relevantChunks = await searchRelevantMemory(query, { limit: 100, minScore: 0, tag });
    const scores = new Map<string, number>();

    for (const chunk of relevantChunks) {
      scores.set(chunk.memoryItemId, Math.max(scores.get(chunk.memoryItemId) ?? 0, chunk.score));
    }

    if (!scores.size) {
      return [];
    }

    const rows = await prisma.memoryItem.findMany({
      where: { 
        id: { in: [...scores.keys()] }
      },
      include: { chunks: { orderBy: { index: "asc" } } }
    });

    return rows
      .map((row) => ({ ...row, tags: safeJsonArray(row.tags), score: scores.get(row.id) ?? 0 }))
      .filter((row) => (tag ? row.tags.includes(tag) : true))
      .sort((left, right) => right.score - left.score);
  }

  const rows = await prisma.memoryItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { chunks: { orderBy: { index: "asc" } } },
    take: 50
  });
  return rows
    .map((row) => ({ ...row, tags: safeJsonArray(row.tags) }))
    .filter((row) => (tag ? row.tags.includes(tag) : true));
}

export async function createMemoryItem(input: {
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  importance?: number;
  type?: string;
}) {
  const chunks = chunkText(input.content);
  const memoryItem = await prisma.memoryItem.create({
    data: {
      type: input.type ?? "note",
      title: input.title,
      content: input.content,
      source: input.source,
      tags: JSON.stringify(input.tags ?? []),
      importance: input.importance ?? 3,
      chunks: {
        create: chunks.map((chunk) => ({
          content: chunk.content,
          index: chunk.index,
          embedding: serializeEmbedding(embedText(chunk.content))
        }))
      }
    },
    include: { chunks: { orderBy: { index: "asc" } } }
  });

  return { ...memoryItem, tags: safeJsonArray(memoryItem.tags) };
}

export async function updateMemoryItem(id: string, data: {
  title?: string;
  content?: string;
  tags?: string[];
  importance?: number;
}) {
  const existing = await prisma.memoryItem.findUnique({
    where: { id },
    include: { chunks: true }
  });

  if (!existing) {
    throw new Error(`Memory item ${id} not found`);
  }

  const updatedContent = data.content ?? existing.content;
  const shouldRegenerateChunks = data.content !== undefined;

  return await prisma.$transaction(async (tx) => {
    if (shouldRegenerateChunks) {
      await tx.memoryChunk.deleteMany({
        where: { memoryItemId: id }
      });

      const newChunks = chunkText(updatedContent);
      for (const chunk of newChunks) {
        await tx.memoryChunk.create({
          data: {
            memoryItemId: id,
            content: chunk.content,
            index: chunk.index,
            embedding: serializeEmbedding(embedText(chunk.content))
          }
        });
      }
    }

    const updated = await tx.memoryItem.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        importance: data.importance,
      }
    });
    return { ...updated, tags: safeJsonArray(updated.tags) };
  });
}

export async function archiveMemoryItem(id: string) {
  // no-op car le champ status n'est plus présent dans le schéma
  console.log(`archiveMemoryItem no-op for ${id}`);
  return null;
}

export async function deleteMemoryItem(id: string) {
  await prisma.memoryItem.delete({ where: { id } });
}

export async function exportMemory() {
  const [conversations, memoryItems] = await Promise.all([
    prisma.conversation.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.memoryItem.findMany({
      orderBy: { updatedAt: "desc" },
      include: { chunks: { orderBy: { index: "asc" } } }
    })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    conversations,
    memoryItems: memoryItems.map((item) => ({ ...item, tags: safeJsonArray(item.tags) }))
  };
}

function shouldRemember(userContent: string, assistantContent: string): boolean {
  const lower = `${userContent}\n${assistantContent}`.toLowerCase();
  return (
    userContent.length >= 240 ||
    lower.includes("souviens") ||
    lower.includes("memorise") ||
    lower.includes("mémorise") ||
    lower.includes("important")
  );
}

export async function memoryStats() {
  const [conversationCount, messageCount, memoryCount, runs] = await Promise.all([
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.memoryItem.count(),
    prisma.automationRun.count()
  ]);
  const agents = await prisma.conversation.groupBy({ by: ["agentId"], _count: true });
  return { conversationCount, messageCount, memoryCount, automationRuns: runs, agents };
}
