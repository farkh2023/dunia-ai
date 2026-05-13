import { describe, expect, it } from "vitest";
import { chunkText } from "@/memory/chunker";
import { cosineSimilarity, embedText, parseEmbedding, serializeEmbedding } from "@/memory/embeddings";
import { buildMemoryMessage } from "@/memory/rag";

describe("local memory RAG", () => {
  it("splits long text into ordered chunks", () => {
    const chunks = chunkText("Phrase un. ".repeat(160), { maxChars: 240, overlapChars: 40 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.index).toBe(0);
    expect(chunks.every((chunk) => chunk.content.length <= 240)).toBe(true);
  });

  it("creates deterministic local embeddings", () => {
    const first = embedText("memoire conversationnelle locale");
    const second = embedText("memoire conversationnelle locale");
    const unrelated = embedText("facture calendrier image");

    expect(first).toEqual(second);
    expect(cosineSimilarity(first, second)).toBeGreaterThan(0.99);
    expect(cosineSimilarity(first, unrelated)).toBeLessThan(0.9);
    expect(parseEmbedding(serializeEmbedding(first))).toEqual(first);
  });

  it("builds an injectable system memory message", () => {
    const message = buildMemoryMessage([
      {
        id: "chunk-1",
        memoryItemId: "memory-1",
        title: "Projet Dunia",
        content: "Preference utilisateur: travailler en local avec Ollama.",
        source: "conversation:c1",
        tags: ["conversation"],
        importance: 4,
        score: 0.82,
        createdAt: new Date("2026-05-13T00:00:00.000Z")
      }
    ]);

    expect(message.role).toBe("system");
    expect(message.content).toContain("Contexte memoire local");
    expect(message.content).toContain("Projet Dunia");
    expect(message.content).toContain("Ollama");
  });
});
