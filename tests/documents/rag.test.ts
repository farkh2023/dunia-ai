import { describe, expect, it } from "vitest";
import { buildRagMessage } from "@/memory/rag";

describe("document RAG integration", () => {
  it("injects document source and relevance in the system prompt", () => {
    const message = buildRagMessage([], [
      {
        id: "chunk-1",
        documentId: "doc-1",
        filename: "strategie.md",
        type: "text/markdown",
        content: "La strategie produit doit rester locale.",
        chunkIndex: 2,
        score: 0.91,
        createdAt: new Date("2026-05-13T00:00:00.000Z")
      }
    ]);

    expect(message.role).toBe("system");
    expect(message.content).toContain("Type source: document");
    expect(message.content).toContain("strategie.md");
    expect(message.content).toContain("Pertinence: 0.91");
  });
});
