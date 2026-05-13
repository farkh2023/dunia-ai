import { prisma } from "@/lib/prisma";
import { safeJsonArray } from "@/lib/utils";
import { cosineSimilarity, embedText, parseEmbedding } from "@/memory/embeddings";

export type MemorySearchResult = {
  id: string;
  memoryItemId: string;
  title: string;
  content: string;
  source: string | null;
  tags: string[];
  importance: number;
  score: number;
  createdAt: Date;
};

export type MemorySearchOptions = {
  limit?: number;
  minScore?: number;
  tag?: string;
};

export async function searchRelevantMemory(
  query: string,
  options: MemorySearchOptions = {}
): Promise<MemorySearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const limit = options.limit ?? 5;
  const minScore = options.minScore ?? 0.08;
  const queryEmbedding = embedText(normalizedQuery);
  const keywordTerms = keywordSet(normalizedQuery);

  const chunks = await prisma.memoryChunk.findMany({
    include: { memoryItem: true },
    orderBy: { createdAt: "desc" },
    take: 250
  });

  return chunks
    .map((chunk) => {
      const tags = safeJsonArray(chunk.memoryItem.tags);
      const vectorScore = cosineSimilarity(queryEmbedding, parseEmbedding(chunk.embedding));
      const keywordScore = lexicalScore(keywordTerms, `${chunk.memoryItem.title} ${chunk.content}`);
      const importanceBoost = Math.min(chunk.memoryItem.importance, 5) * 0.03;

      return {
        id: chunk.id,
        memoryItemId: chunk.memoryItemId,
        title: chunk.memoryItem.title,
        content: chunk.content,
        source: chunk.memoryItem.source,
        tags,
        importance: chunk.memoryItem.importance,
        score: Number((vectorScore * 0.75 + keywordScore * 0.25 + importanceBoost).toFixed(4)),
        createdAt: chunk.createdAt
      };
    })
    .filter((result) => (options.tag ? result.tags.includes(options.tag) : true))
    .filter((result) => result.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function keywordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2)
  );
}

function lexicalScore(queryTerms: Set<string>, text: string): number {
  if (!queryTerms.size) {
    return 0;
  }

  const textTerms = keywordSet(text);
  let matches = 0;

  for (const term of queryTerms) {
    if (textTerms.has(term)) {
      matches += 1;
    }
  }

  return matches / queryTerms.size;
}
