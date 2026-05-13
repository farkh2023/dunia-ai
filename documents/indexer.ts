import { prisma } from "@/lib/prisma";
import type { LoadedDocument } from "@/lib/document-loader";
import { chunkText } from "@/memory/chunker";
import { embedText, serializeEmbedding } from "@/memory/embeddings";

export const MAX_DOCUMENT_CHUNKS = 120;

export async function indexDocument(document: LoadedDocument) {
  const chunks = chunkText(document.content, { maxChars: 1200, overlapChars: 160 }).slice(0, MAX_DOCUMENT_CHUNKS);

  if (!chunks.length) {
    throw new Error("Aucun texte exploitable n'a ete extrait du document.");
  }

  return prisma.document.create({
    data: {
      filename: document.filename,
      type: document.type,
      size: document.size,
      content: document.content,
      pages: document.pages,
      chunks: {
        create: chunks.map((chunk) => ({
          content: chunk.content,
          chunkIndex: chunk.index,
          embedding: serializeEmbedding(embedText(chunk.content))
        }))
      }
    },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } }
  });
}

export async function listDocuments() {
  return prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } }
  });
}

export async function deleteDocument(id: string) {
  await prisma.document.delete({ where: { id } });
}
