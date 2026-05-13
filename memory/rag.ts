import type { AiMessage } from "@/lib/ai";
import { searchRelevantMemory, type MemorySearchResult } from "@/memory/search";

export type RagContext = {
  messages: AiMessage[];
  memories: MemorySearchResult[];
};

export async function withMemoryContext(input: {
  query: string;
  messages: AiMessage[];
  limit?: number;
}): Promise<RagContext> {
  const memories = await searchRelevantMemory(input.query, { limit: input.limit ?? 5 });

  if (!memories.length) {
    return { messages: input.messages, memories };
  }

  return {
    memories,
    messages: [buildMemoryMessage(memories), ...input.messages]
  };
}

export function buildMemoryMessage(memories: MemorySearchResult[]): AiMessage {
  return {
    role: "system",
    content: [
      "Contexte memoire local pertinent pour cette demande.",
      "Utilise ces informations seulement si elles aident la reponse. Ne les invente pas et ne mentionne pas la memoire si elle n'est pas utile.",
      "",
      ...memories.map((memory, index) =>
        [
          `[Memoire ${index + 1}] ${memory.title}`,
          `Source: ${memory.source ?? "memoire locale"} | Importance: ${memory.importance} | Score: ${memory.score}`,
          memory.tags.length ? `Tags: ${memory.tags.join(", ")}` : "Tags: aucun",
          memory.content
        ].join("\n")
      )
    ].join("\n\n")
  };
}
