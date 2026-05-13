import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { loadDocumentFile, sanitizeFilename, validateDocumentFile } from "@/lib/document-loader";

describe("document loader", () => {
  it("parses markdown as UTF-8 text", async () => {
    const file = makeFile("# Projet\n\nMemoire locale documentee.", "notes.md", "text/markdown");
    const loaded = await loadDocumentFile(file);

    expect(loaded.type).toBe("text/markdown");
    expect(loaded.content).toContain("Memoire locale");
    expect(loaded.metadata.extension).toBe(".md");
  });

  it("extracts text from PDF files", async () => {
    const pdf = new jsPDF();
    pdf.text("Dunia document PDF local", 10, 10);
    const bytes = pdf.output("arraybuffer");
    const file = makeFile(bytes, "rapport.pdf", "application/pdf");

    const loaded = await loadDocumentFile(file);

    expect(loaded.type).toBe("application/pdf");
    expect(loaded.pages).toBeGreaterThanOrEqual(1);
    expect(loaded.content).toContain("Dunia document PDF local");
  });

  it("rejects dangerous file extensions", () => {
    expect(() => validateDocumentFile({ name: "run.exe", size: 12, type: "application/x-msdownload" })).toThrow();
    expect(sanitizeFilename("../secret.txt")).not.toContain("/");
  });
});

function makeFile(content: string | ArrayBuffer, name: string, type: string): File {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : new Uint8Array(content);
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  } as File;
}
