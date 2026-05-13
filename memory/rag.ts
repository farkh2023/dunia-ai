import type { AiMessage } from "@/lib/ai";
import { searchDocuments, type DocumentSearchResult } from "@/documents/search";
import { searchRelevantMemory, type MemorySearchResult } from "@/memory/search";

export type RagContext = {
  messages: AiMessage[];
  memories: MemorySearchResult[];
  documents: DocumentSearchResult[];
};

export async function withMemoryContext(input: {
  query: string;
  messages: AiMessage[];
  limit?: number;
}): Promise<RagContext> {
  const limit = input.limit ?? 5;
  const [memories, documents] = await Promise.all([
    searchRelevantMemory(input.query, { limit }),
    searchDocuments(input.query, { limit })
  ]);

  if (!memories.length && !documents.length) {
    return { messages: input.messages, memories, documents };
  }

  return {
    memories,
    documents,
    messages: [buildRagMessage(memories, documents), ...input.messages]
  };
}

export function buildMemoryMessage(memories: MemorySearchResult[]): AiMessage {
  return buildRagMessage(memories, []);
}

export function buildRagMessage(memories: MemorySearchResult[], documents: DocumentSearchResult[]): AiMessage {
  return {
    role: "system",
    content: [
      "Contexte RAG local pertinent pour cette demande.",
      "Utilise ces informations seulement si elles aident la reponse. Ne les invente pas et cite sobrement la source quand elle est utile.",
      "",
      ...memories.map((memory, index) =>
        [
          `[Memoire ${index + 1}] ${memory.title}`,
          `Type source: memoire | Source: ${memory.source ?? "memoire locale"} | Importance: ${memory.importance} | Pertinence: ${memory.score}`,
          memory.tags.length ? `Tags: ${memory.tags.join(", ")}` : "Tags: aucun",
          memory.content
        ].join("\n")
      ),
      ...documents.map((document, index) =>
        [
          `[Document ${index + 1}] ${document.filename}`,
          `Type source: document | MIME: ${document.type} | Chunk: ${document.chunkIndex} | Pertinence: ${document.score}`,
          document.content
        ].join("\n")
      )
    ].join("\n\n")
  };
}
