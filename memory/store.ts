import { prisma } from "@/lib/prisma";
import { estimateTokens, makeConversationTitle, safeJsonArray } from "@/lib/utils";
import type { AiMessage } from "@/lib/ai";

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
  const rows = await prisma.memoryItem.findMany({
    where: query
      ? {
          OR: [{ title: { contains: query } }, { content: { contains: query } }]
        }
      : {},
    orderBy: { updatedAt: "desc" },
    take: 50
  });
  return rows
    .map((row) => ({ ...row, tags: safeJsonArray(row.tags) }))
    .filter((row) => (tag ? row.tags.includes(tag) : true));
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
    prisma.memoryItem.findMany({ orderBy: { updatedAt: "desc" } })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    conversations,
    memoryItems: memoryItems.map((item) => ({ ...item, tags: safeJsonArray(item.tags) }))
  };
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
