"use client";

import React, { type FormEvent, type ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { validateMemoryForm, type MemoryForm } from "@/lib/memory-form";

type MemoryChunk = {
  id: string;
  content: string;
  index: number;
  createdAt: string;
};

type MemoryItem = {
  id: string;
  title: string;
  content: string;
  source: string | null;
  tags: string[];
  importance: number;
  createdAt: string;
  updatedAt: string;
  chunks?: MemoryChunk[];
  score?: number;
};

type Conversation = {
  id: string;
  title: string;
  agentId: string;
  messages: Array<{ role: string; content: string }>;
};

const emptyForm: MemoryForm = {
  title: "",
  content: "",
  source: "",
  tags: "",
  importance: "3"
};

export default function MemoryPage() {
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [form, setForm] = useState<MemoryForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  const totalChunks = useMemo(
    () => memory.reduce((total, item) => total + (item.chunks?.length ?? 0), 0),
    [memory]
  );

  const loadMemory = useCallback(async (search = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      const response = await fetch(`/api/memory${params.toString() ? `?${params.toString()}` : ""}`);
      const data = (await response.json()) as { memory?: MemoryItem[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Chargement de la memoire impossible.");
      }
      setMemory(data.memory ?? []);
      setActiveQuery(search.trim());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur inconnue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemory();
    setCurrentConversationId(window.localStorage.getItem("dunia-active-conversation-id"));
  }, [loadMemory]);

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadMemory(query);
  }

  async function submitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateMemoryForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toMemoryPayload(form))
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Creation de la memoire impossible.");
      }
      setForm(emptyForm);
      toast({ title: "Memoire indexee", description: "Le contenu est disponible pour le RAG local." });
      await loadMemory(activeQuery);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erreur inconnue.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMemory(id: string) {
    setError(null);
    const response = await fetch("/api/memory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      setError("Suppression impossible.");
      return;
    }
    setMemory((items) => items.filter((item) => item.id !== id));
  }

  async function indexCurrentConversation() {
    if (!currentConversationId) {
      return;
    }

    setIsIndexing(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${currentConversationId}`);
      const data = (await response.json()) as { conversation?: Conversation; error?: string };
      if (!response.ok || !data.conversation) {
        throw new Error(data.error ?? "Conversation courante introuvable.");
      }

      const content = data.conversation.messages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n\n");

      const createResponse = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.conversation.title,
          content,
          source: `conversation:${data.conversation.id}`,
          tags: ["conversation", data.conversation.agentId],
          importance: 4
        })
      });
      const createData = (await createResponse.json()) as { error?: string };
      if (!createResponse.ok) {
        throw new Error(createData.error ?? "Indexation de la conversation impossible.");
      }
      toast({ title: "Conversation indexee", description: "La conversation courante est maintenant en memoire." });
      await loadMemory(activeQuery);
    } catch (indexError) {
      setError(indexError instanceof Error ? indexError.message : "Erreur inconnue.");
    } finally {
      setIsIndexing(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">RAG local et memoire intelligente</p>
            <h1 className="text-3xl font-bold">Memoire Dunia AI</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentConversationId && (
              <Button onClick={() => void indexCurrentConversation()} disabled={isIndexing} variant="secondary">
                {isIndexing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Indexer cette conversation
              </Button>
            )}
            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour chat
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Memoires" value={memory.length} />
          <Metric label="Chunks indexes" value={totalChunks} />
          <Metric label="Recherche" value={activeQuery ? "active" : "globale"} />
        </section>

        {error && (
          <Card className="border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </Card>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Ajouter une memoire</h2>
            </div>
            <form className="space-y-3" onSubmit={(event) => void submitMemory(event)}>
              <Field
                label="Titre"
                value={form.title}
                onChange={(value) => setForm((current) => ({ ...current, title: value }))}
                placeholder="Preference, projet, fait important..."
              />
              <Textarea
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Contenu a indexer dans la memoire locale..."
                aria-label="Contenu"
                className="min-h-40"
              />
              <Field
                label="Source"
                value={form.source}
                onChange={(value) => setForm((current) => ({ ...current, source: value }))}
                placeholder="note, document, conversation..."
              />
              <Field
                label="Tags"
                value={form.tags}
                onChange={(value) => setForm((current) => ({ ...current, tags: value }))}
                placeholder="travail, projet, recherche"
              />
              <label className="block text-sm font-medium">
                Importance
                <Select
                  value={form.importance}
                  onChange={(event) => setForm((current) => ({ ...current, importance: event.target.value }))}
                  className="mt-1 w-full"
                  aria-label="Importance"
                >
                  <option value="1">1 - faible</option>
                  <option value="2">2</option>
                  <option value="3">3 - standard</option>
                  <option value="4">4</option>
                  <option value="5">5 - critique</option>
                </Select>
              </label>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Indexer la memoire
              </Button>
            </form>
          </Card>

          <section className="space-y-4">
            <Card className="p-4">
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void submitSearch(event)}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher dans la memoire locale..."
                  aria-label="Recherche memoire"
                  className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Rechercher
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    void loadMemory();
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reinitialiser
                </Button>
              </form>
            </Card>

            {isLoading && (
              <Card className="flex items-center gap-3 p-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement de la memoire locale...
              </Card>
            )}

            {!isLoading && memory.length === 0 && (
              <Card className="p-8 text-center">
                <Database className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-3 text-xl font-semibold">Aucune memoire indexee</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajoutez une note, indexez une conversation ou recherchez un autre terme.
                </p>
              </Card>
            )}

            {!isLoading && memory.length > 0 && (
              <div className="grid gap-3">
                {memory.map((item) => (
                  <MemoryCard key={item.id} item={item} showScore={Boolean(activeQuery)} onDelete={deleteMemory} />
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function MemoryCard({
  item,
  showScore,
  onDelete
}: {
  item: MemoryItem;
  showScore: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{item.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.source ?? "memoire locale"} / {formatDate(item.createdAt)}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => void onDelete(item.id)} title="Supprimer">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{item.content}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <Pill>{item.chunks?.length ?? 0} chunk(s)</Pill>
        <Pill>importance {item.importance}</Pill>
        {showScore && typeof item.score === "number" && <Pill>score {item.score.toFixed(2)}</Pill>}
        {item.tags.map((tag) => (
          <Pill key={tag}>{tag}</Pill>
        ))}
      </div>
    </Card>
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

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{children}</span>;
}

function toMemoryPayload(form: MemoryForm) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    source: form.source.trim() || undefined,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    importance: Number(form.importance)
  };
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
