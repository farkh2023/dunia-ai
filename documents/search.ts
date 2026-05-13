import { prisma } from "@/lib/prisma";
import { cosineSimilarity, embedText, parseEmbedding } from "@/memory/embeddings";

export type DocumentSearchResult = {
  id: string;
  documentId: string;
  filename: string;
  type: string;
  content: string;
  chunkIndex: number;
  score: number;
  createdAt: Date;
};

export type DocumentSearchOptions = {
  limit?: number;
  minScore?: number;
};

export async function searchDocuments(
  query: string,
  options: DocumentSearchOptions = {}
): Promise<DocumentSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const limit = options.limit ?? 5;
  const minScore = options.minScore ?? 0.05;
  const queryEmbedding = embedText(normalizedQuery);
  const terms = keywordSet(normalizedQuery);

  const chunks = await prisma.documentChunk.findMany({
    include: { document: true },
    orderBy: { createdAt: "desc" },
    take: 400
  });

  return chunks
    .map((chunk) => {
      const vectorScore = cosineSimilarity(queryEmbedding, parseEmbedding(chunk.embedding));
      const keywordScore = lexicalScore(terms, `${chunk.document.filename} ${chunk.content}`);
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        filename: chunk.document.filename,
        type: chunk.document.type,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        score: Number((vectorScore * 0.72 + keywordScore * 0.28).toFixed(4)),
        createdAt: chunk.createdAt
      };
    })
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
