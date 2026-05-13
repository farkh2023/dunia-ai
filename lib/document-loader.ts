import { PDFParse } from "pdf-parse";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_DOCUMENT_TYPES,
  type SupportedDocumentType
} from "@/lib/document-constants";

export { MAX_DOCUMENT_SIZE_BYTES, SUPPORTED_DOCUMENT_EXTENSIONS, SUPPORTED_DOCUMENT_TYPES };
export type { SupportedDocumentType };

export type LoadedDocument = {
  filename: string;
  type: SupportedDocumentType;
  size: number;
  content: string;
  pages?: number;
  metadata: {
    extension: string;
  };
};

export async function loadDocumentFile(file: File): Promise<LoadedDocument> {
  validateDocumentFile(file);
  const type = resolveDocumentType(file);
  const extension = extensionFor(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (type === "application/pdf") {
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      return {
        filename: sanitizeFilename(file.name),
        type,
        size: file.size,
        content: normalizeExtractedText(result.text),
        pages: result.total,
        metadata: { extension }
      };
    } finally {
      await parser.destroy();
    }
  }

  return {
    filename: sanitizeFilename(file.name),
    type,
    size: file.size,
    content: normalizeExtractedText(new TextDecoder("utf-8").decode(bytes)),
    metadata: { extension }
  };
}

export function validateDocumentFile(file: Pick<File, "name" | "size" | "type">) {
  const extension = extensionFor(file.name);

  if (file.size <= 0) {
    throw new Error("Le fichier est vide.");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("Le fichier depasse la limite de 8 Mo.");
  }
  if (!SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number])) {
    throw new Error("Format non supporte. Utilisez PDF, Markdown ou TXT.");
  }

  const type = resolveDocumentType(file);
  if (!SUPPORTED_DOCUMENT_TYPES.includes(type)) {
    throw new Error("Type MIME non supporte.");
  }
}

export function resolveDocumentType(file: Pick<File, "name" | "type">): SupportedDocumentType {
  const extension = extensionFor(file.name);

  if (extension === ".pdf") {
    return "application/pdf";
  }
  if (extension === ".md") {
    return "text/markdown";
  }
  if (extension === ".txt") {
    return "text/plain";
  }

  if (SUPPORTED_DOCUMENT_TYPES.includes(file.type as SupportedDocumentType)) {
    return file.type as SupportedDocumentType;
  }

  throw new Error("Format non supporte. Utilisez PDF, Markdown ou TXT.");
}

export function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "document";
}

function extensionFor(filename: string): string {
  const safeName = filename.toLowerCase().trim();
  const dotIndex = safeName.lastIndexOf(".");
  return dotIndex >= 0 ? safeName.slice(dotIndex) : "";
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
