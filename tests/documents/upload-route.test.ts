import { beforeEach, describe, expect, it, vi } from "vitest";

const loadDocumentFileMock = vi.fn();
const indexDocumentMock = vi.fn();

vi.mock("@/lib/document-loader", () => ({
  loadDocumentFile: loadDocumentFileMock
}));

vi.mock("@/documents/indexer", () => ({
  indexDocument: indexDocumentMock
}));

describe("documents upload API", () => {
  beforeEach(() => {
    loadDocumentFileMock.mockReset();
    indexDocumentMock.mockReset();
  });

  it("uploads and indexes a document", async () => {
    const { POST } = await import("@/app/api/documents/upload/route");
    const file = new File(["memoire documentaire"], "memoire.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.set("file", file);
    loadDocumentFileMock.mockResolvedValue({
      filename: "memoire.txt",
      type: "text/plain",
      size: file.size,
      content: "memoire documentaire",
      metadata: { extension: ".txt" }
    });
    indexDocumentMock.mockResolvedValue({ id: "doc-1", filename: "memoire.txt" });

    const request = { formData: async () => formData } as Request;
    const response = await POST(request);
    const data = (await response.json()) as { document: { id: string } };

    expect(response.status).toBe(201);
    expect(data.document.id).toBe("doc-1");
    expect(indexDocumentMock).toHaveBeenCalledOnce();
  });
});
