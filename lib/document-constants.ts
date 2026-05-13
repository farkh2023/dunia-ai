export const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024;
export const SUPPORTED_DOCUMENT_TYPES = ["application/pdf", "text/markdown", "text/plain"] as const;
export const SUPPORTED_DOCUMENT_EXTENSIONS = [".pdf", ".md", ".txt"] as const;

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];
