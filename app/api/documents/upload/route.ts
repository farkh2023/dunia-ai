import { NextResponse } from "next/server";
import { indexDocument } from "@/documents/indexer";
import { loadDocumentFile } from "@/lib/document-loader";
import { documentUploadSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }

    documentUploadSchema.parse({ name: file.name, size: file.size, type: file.type });
    const loaded = await loadDocumentFile(file);
    const document = await indexDocument(loaded);

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
