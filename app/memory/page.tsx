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
  Trash2,
  Tag,
  Calendar,
  AlertCircle,
  FileText,
  MessageSquare,
  Sparkles,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  type: string;
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

type SortOption = "date-desc" | "date-asc" | "importance-desc" | "score-desc";

export default function MemoryPage() {
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [form, setForm] = useState<MemoryForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMemory = useCallback(async (search = "", tag = activeTag) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (tag) params.set("tag", tag);
      
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
  }, [activeTag]);

  useEffect(() => {
    void loadMemory();
    setCurrentConversationId(window.localStorage.getItem("dunia-active-conversation-id"));
  }, [loadMemory]);

  const filteredAndSortedMemory = useMemo(() => {
    let result = [...memory];

    if (activeType !== "all") {
      result = result.filter((item) => item.type === activeType);
    }

    result.sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "importance-desc") return b.importance - a.importance;
      if (sortBy === "score-desc") return (b.score ?? 0) - (a.score ?? 0);
      return 0;
    });

    return result;
  }, [memory, activeType, sortBy]);

  const stats = useMemo(() => {
    const total = memory.length;
    const facts = memory.filter(m => m.type === "fact").length;
    const chats = memory.filter(m => m.type === "conversation").length;
    const notes = memory.filter(m => m.type === "note").length;
    const totalChunks = memory.reduce((total, item) => total + (item.chunks?.length ?? 0), 0);
    const uniqueTags = Array.from(new Set(memory.flatMap(m => m.tags)));
    
    return { total, facts, chats, notes, totalChunks, uniqueTags };
  }, [memory]);

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
    toast({ title: "Souvenir supprimé", description: "L'élément a été retiré de la mémoire locale." });
  }

  async function indexCurrentConversation() {
    if (!currentConversationId) return;

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
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              <p className="text-sm font-medium uppercase tracking-wider">Base de Connaissances Locale</p>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Mémoire Dunia AI</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {currentConversationId && (
              <Button onClick={() => void indexCurrentConversation()} disabled={isIndexing} variant="secondary" className="border border-primary/20 bg-primary/5 hover:bg-primary/10">
                {isIndexing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-amber-500" />}
                Indexer la conversation
              </Button>
            )}

            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au chat
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-6">
            <Card className="overflow-hidden border-none bg-muted/50 p-0">
              <div className="bg-primary/5 p-4 border-b border-primary/10">
                <h2 className="flex items-center gap-2 font-bold">
                  <Info className="h-4 w-4 text-primary" />
                  Statistiques
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <SidebarMetric label="Total" value={stats.total} icon={<Database className="h-4 w-4" />} />
                <div className="grid grid-cols-2 gap-2">
                  <SidebarMetric label="Faits" value={stats.facts} small />
                  <SidebarMetric label="Chats" value={stats.chats} small />
                  <SidebarMetric label="Notes" value={stats.notes} small />
                  <SidebarMetric label="Chunks" value={stats.totalChunks} small />
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-4 w-4" />
                Tags populaires
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setActiveTag(null); void loadMemory(activeQuery, null); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!activeTag ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                >
                  Tous
                </button>
                {stats.uniqueTags.slice(0, 15).map(tag => (
                  <button
                    key={tag}
                    onClick={() => { const newTag = activeTag === tag ? null : tag; setActiveTag(newTag); void loadMemory(activeQuery, newTag); }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeTag === tag ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <Card className="p-4 border-dashed bg-transparent border-primary/20">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Ajouter une note
              </h3>
              <form className="space-y-3" onSubmit={(event) => void submitMemory(event)}>
                <input
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Titre..."
                  className="w-full bg-background border rounded-md px-3 py-2 text-sm"
                />
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Contenu à indexer..."
                  className="min-h-24 text-sm"
                />
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Indexer"}
                </Button>
              </form>
            </Card>
          </aside>

          <div className="space-y-6">
            <Card className="p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <form className="relative flex-1" onSubmit={(event) => void submitSearch(event)}>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher sémantiquement..."
                    aria-label="Recherche memoire"
                    className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {query && (
                    <button 
                      type="button" 
                      onClick={() => { setQuery(""); void loadMemory("", activeTag); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  )}
                  <button type="submit" className="hidden">Rechercher</button>
                </form>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  <div className="flex rounded-lg border p-1 bg-muted/30">
                    <TypeFilter active={activeType === "all"} onClick={() => setActiveType("all")} label="Tout" />
                    <TypeFilter active={activeType === "fact"} onClick={() => setActiveType("fact")} label="Faits" icon={<Sparkles className="h-3 w-3" />} />
                    <TypeFilter active={activeType === "conversation"} onClick={() => setActiveType("conversation")} label="Chats" icon={<MessageSquare className="h-3 w-3" />} />
                    <TypeFilter active={activeType === "note"} onClick={() => setActiveType("note")} label="Notes" icon={<FileText className="h-3 w-3" />} />
                  </div>

                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-10 rounded-lg border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="date-desc">Plus récent</option>
                    <option value="date-asc">Plus ancien</option>
                    <option value="importance-desc">Importance</option>
                    {activeQuery && <option value="score-desc">Pertinence</option>}
                  </select>
                </div>
              </div>
            </Card>

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="animate-pulse text-sm">Chargement de la memoire locale...</p>
              </div>
            ) : filteredAndSortedMemory.length === 0 ? (
              <Card className="flex h-64 flex-col items-center justify-center border-dashed p-8 text-center bg-muted/10">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Database className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-bold">Aucun souvenir trouvé</h2>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {activeQuery ? "Aucun résultat pour cette recherche." : activeTag ? "Aucun souvenir avec ce tag." : "Votre mémoire locale est vide pour le moment."}
                </p>
                {(activeQuery || activeTag || activeType !== "all") && (
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-primary" 
                    onClick={() => { setQuery(""); setActiveTag(null); setActiveType("all"); void loadMemory("", null); }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
                  <span>{filteredAndSortedMemory.length} résultat(s)</span>
                  <span>Trié par : {sortBy.replace("-desc", "").replace("-asc", "").replace("date", "Date").replace("importance", "Importance").replace("score", "Pertinence")}</span>
                </div>
                {filteredAndSortedMemory.map((item) => (
                  <MemoryCard key={item.id} item={item} showScore={Boolean(activeQuery)} onDelete={deleteMemory} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function SidebarMetric({ label, value, icon, small = false }: { label: string, value: number | string, icon?: ReactNode, small?: boolean }) {
  return (
    <div className={`flex flex-col ${small ? "p-2 bg-background border rounded-lg" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`${small ? "text-lg" : "text-3xl"} font-extrabold tracking-tight`}>{value}</span>
    </div>
  );
}

function TypeFilter({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-md ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      {icon}
      {label}
    </button>
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
  const typeLabel = item.type === "fact" ? "Fait" : item.type === "conversation" ? "Chat" : "Note";
  const typeIcon = item.type === "fact" ? <Sparkles className="h-3 w-3" /> : item.type === "conversation" ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />;
  const typeColor = item.type === "fact" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : 
                    item.type === "conversation" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                    "bg-muted text-muted-foreground";

  const importanceColors = [
    "",
    "border-l-muted",
    "border-l-blue-400",
    "border-l-emerald-400",
    "border-l-amber-400",
    "border-l-rose-500"
  ];

  return (
    <Card className={`group relative overflow-hidden transition-all hover:shadow-md border-l-4 ${importanceColors[item.importance] || "border-l-muted"}`}>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeColor}`}>
                {typeIcon}
                {typeLabel}
              </span>
              {showScore && typeof item.score === "number" && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  {(item.score * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {item.title}
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(item.createdAt)}
              </span>
              <span>•</span>
              <span className="truncate max-w-[150px]">
                {item.source?.replace("conversation:", "Chat ID: ") ?? "Mémoire locale"}
              </span>
            </div>
          </div>
          
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => void onDelete(item.id)} 
            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 relative">
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
            {item.content}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-default">
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
            <span>{item.chunks?.length ?? 0} fragments</span>
          </div>
        </div>
      </div>
    </Card>
  );
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
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
