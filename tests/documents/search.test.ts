import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchDocuments } from "@/documents/search";
import { serializeEmbedding, embedText } from "@/memory/embeddings";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentChunk: {
      findMany: mocks.findMany
    }
  }
}));

describe("document search", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("returns relevant document chunks", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "chunk-1",
        documentId: "doc-1",
        content: "Ollama indexe les documents locaux",
        chunkIndex: 0,
        embedding: serializeEmbedding(embedText("Ollama documents locaux")),
        createdAt: new Date("2026-05-13T00:00:00.000Z"),
        document: { filename: "ollama.md", type: "text/markdown" }
      }
    ]);

    const results = await searchDocuments("documents ollama", { limit: 3 });

    expect(results).toHaveLength(1);
    expect(results[0]?.filename).toBe("ollama.md");
    expect(results[0]?.score).toBeGreaterThan(0);
  });
});
