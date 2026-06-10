import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexDocument, MAX_DOCUMENT_CHUNKS } from "@/documents/indexer";

const mocks = vi.hoisted(() => ({
  create: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      create: mocks.create
    }
  }
}));

describe("document indexer", () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.create.mockResolvedValue({ id: "doc-1", chunks: [] });
  });

  it("chunks and stores document embeddings", async () => {
    await indexDocument({
      filename: "notes.txt",
      type: "text/plain",
      size: 120,
      content: "Dunia memoire locale. ".repeat(120),
      metadata: { extension: ".txt" }
    });

    const payload = mocks.create.mock.calls[0][0];
    expect(payload.data.filename).toBe("notes.txt");
    expect(payload.data.chunks.create.length).toBeGreaterThan(1);
    expect(payload.data.chunks.create.length).toBeLessThanOrEqual(MAX_DOCUMENT_CHUNKS);
    expect(JSON.parse(payload.data.chunks.create[0].embedding)).toHaveLength(384);
  });
});
