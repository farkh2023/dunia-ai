"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MAX_DOCUMENT_SIZE_BYTES } from "@/lib/document-constants";

type DocumentChunk = {
  id: string;
  content: string;
  chunkIndex: number;
  createdAt: string;
};

type IndexedDocument = {
  id: string;
  filename: string;
  type: string;
  size: number;
  content: string;
  pages: number | null;
  createdAt: string;
  chunks: DocumentChunk[];
};

type SearchResult = {
  id: string;
  documentId: string;
  filename: string;
  type: string;
  content: string;
  chunkIndex: number;
  score: number;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const totalChunks = useMemo(
    () => documents.reduce((total, document) => total + document.chunks.length, 0),
    [documents]
  );

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/documents/list");
      const data = (await response.json()) as { documents?: IndexedDocument[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Chargement des documents impossible.");
      }
      setDocuments(data.documents ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur inconnue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || isUploading) {
        return;
      }

      setIsUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Import impossible.");
        }
        toast({ title: "Document indexe", description: `${file.name} est disponible pour le RAG local.` });
        await loadDocuments();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Erreur inconnue.");
      } finally {
        setIsUploading(false);
      }
    },
    [isUploading, loadDocuments, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_DOCUMENT_SIZE_BYTES,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "text/plain": [".txt"]
    }
  });

  async function search() {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/search?q=${encodeURIComponent(query.trim())}&limit=8`);
      const data = (await response.json()) as { results?: SearchResult[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Recherche impossible.");
      }
      setResults(data.results ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Erreur inconnue.");
    } finally {
      setIsSearching(false);
    }
  }

  async function deleteDocument(id: string) {
    setError(null);
    const response = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      setError("Suppression du document impossible.");
      return;
    }
    setDocuments((items) => items.filter((item) => item.id !== id));
    setResults((items) => items.filter((item) => item.documentId !== id));
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Base documentaire intelligente locale</p>
            <h1 className="text-3xl font-bold">Documents Dunia AI</h1>
          </div>
          <Button asChild variant="secondary">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour chat
            </Link>
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Documents" value={documents.length} />
          <Metric label="Chunks indexes" value={totalChunks} />
          <Metric label="Formats" value="PDF / MD / TXT" />
        </section>

        {error && (
          <Card className="border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </Card>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <Card
              {...getRootProps()}
              className={`cursor-pointer p-6 transition ${isDragActive ? "border-primary bg-muted" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-3 text-primary">
                  {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Importer et indexer</h2>
                  <p className="text-sm text-muted-foreground">
                    Glissez un PDF, Markdown ou TXT. Limite: {Math.round(MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024)} Mo.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void search();
                }}
              >
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher dans les documents..."
                  aria-label="Recherche documents"
                  className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Rechercher
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </form>
            </Card>

            {results.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Resultats pertinents</h2>
                {results.map((result) => (
                  <Card key={result.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{result.filename}</h3>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        score {result.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{result.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {result.type} / chunk {result.chunkIndex}
                    </p>
                  </Card>
                ))}
              </section>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Documents indexes</h2>
            {isLoading && (
              <Card className="flex items-center gap-3 p-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement des documents...
              </Card>
            )}

            {!isLoading && documents.length === 0 && (
              <Card className="p-8 text-center">
                <Database className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-xl font-semibold">Aucun document indexe</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Importez un PDF, un Markdown ou un TXT pour alimenter le contexte RAG local.
                </p>
              </Card>
            )}

            {!isLoading &&
              documents.map((document) => (
                <Card key={document.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h3 className="truncate font-semibold">{document.filename}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {document.type} / {formatBytes(document.size)} / {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => void deleteDocument(document.id)} title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{document.content}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Pill>{document.chunks.length} chunk(s)</Pill>
                    <Pill>{document.pages ? `${document.pages} page(s)` : "texte brut"}</Pill>
                    <Pill>indexe</Pill>
                  </div>
                </Card>
              ))}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{children}</span>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} o`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} Ko`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}
