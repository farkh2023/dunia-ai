"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useDropzone } from "react-dropzone";
import {
  Brain,
  Copy,
  Files,
  Download,
  FileText,
  LayoutDashboard,
  Database,
  Mic,
  Moon,
  Plus,
  Send,
  Sun,
  Volume2,
  Wifi,
  WifiOff,
  Workflow
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { agentList } from "@/agents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  agentId: string;
  provider: string;
  model: string;
  updatedAt: string;
  messages: Message[];
};

type Status = {
  mode: string;
  ollama: { online: boolean; models: string[] };
  providers: { openai: boolean; anthropic: boolean; mistral: boolean };
  stats: { conversationCount: number; messageCount: number; memoryCount: number };
};

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentId, setAgentId] = useState("analyste");
  const [provider, setProvider] = useState("auto");
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; content: string }>>([]);
  const [status, setStatus] = useState<Status>();
  const [isSending, setIsSending] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeAgent = useMemo(() => agentList.find((agent) => agent.id === agentId), [agentId]);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/conversations");
    const data = (await response.json()) as { conversations: Conversation[] };
    setConversations(data.conversations);
    if (!activeId && data.conversations[0]) {
      setActiveId(data.conversations[0].id);
      setMessages(data.conversations[0].messages);
      setAgentId(data.conversations[0].agentId);
    }
  }, [activeId]);

  useEffect(() => {
    void loadConversations();
    void fetch("/api/status")
      .then((response) => response.json())
      .then((data: Status) => setStatus(data));
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeId) {
      window.localStorage.setItem("dunia-active-conversation-id", activeId);
    }
  }, [activeId]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const parsed = await Promise.all(
        files.slice(0, 4).map(async (file) => ({
          name: file.name,
          content: await file.text()
        }))
      );
      setAttachments((current) => [...current, ...parsed]);
      toast({ title: "Fichier ajoute", description: `${parsed.length} document(s) pret(s) pour le contexte.` });
    },
    [toast]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  async function sendMessage() {
    if (!prompt.trim() || isSending) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: prompt };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setIsSending(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, message: userMessage.content, agentId, provider, attachments })
    });
    const data = (await response.json()) as { conversationId?: string; content?: string; error?: string; model?: string };
    setIsSending(false);

    if (!response.ok || data.error) {
      toast({ title: "Erreur IA", description: data.error ?? "Generation impossible." });
      return;
    }

    setActiveId(data.conversationId);
    setAttachments([]);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", content: data.content ?? "" }
    ]);
    await loadConversations();
  }

  async function loadConversation(conversation: Conversation) {
    setActiveId(conversation.id);
    setMessages(conversation.messages);
    setAgentId(conversation.agentId);
  }

  async function exportConversation(format: "markdown" | "pdf" | "json") {
    if (!activeId) return;
    const response = await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, format })
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dunia-${activeId}.${format === "markdown" ? "md" : format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function dictate() {
    const SpeechRecognition =
      window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Reconnaissance vocale indisponible", description: "Votre navigateur ne l'expose pas." });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.onresult = (event) => setPrompt((current) => `${current} ${event.results[0][0].transcript}`.trim());
    recognition.start();
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[300px_1fr]">
      <aside className="border-r bg-card">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div>
            <p className="text-sm text-muted-foreground">Centre IA personnel</p>
            <h1 className="text-xl font-bold">Dunia AI</h1>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setMessages([])} title="Nouvelle conversation">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-3 p-4">
          <Button asChild className="w-full justify-start" variant="secondary">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild className="w-full justify-start" variant="ghost">
            <Link href="/memory">
              <Database className="mr-2 h-4 w-4" />
              Memoire
            </Link>
          </Button>
          <Button asChild className="w-full justify-start" variant="ghost">
            <Link href="/documents">
              <Files className="mr-2 h-4 w-4" />
              Documents
            </Link>
          </Button>
          <Button asChild className="w-full justify-start" variant="ghost">
            <Link href="/workflows">
              <Workflow className="mr-2 h-4 w-4" />
              Workflows
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm">
            {status?.ollama.online ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-accent" />}
            <span>{status?.ollama.online ? "Ollama actif" : "Mode cloud ou configuration requise"}</span>
          </div>
        </div>
        <div className="max-h-[calc(100vh-180px)] space-y-2 overflow-auto px-3 pb-4">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => void loadConversation(conversation)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                activeId === conversation.id ? "border-primary bg-muted" : "hover:bg-muted"
              }`}
            >
              <span className="block truncate font-medium">{conversation.title}</span>
              <span className="text-xs text-muted-foreground">{conversation.agentId} / {conversation.model}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-screen flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              {agentList.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
            <Select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="auto">Auto</option>
              <option value="ollama">Ollama local</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="mistral">Mistral</option>
              <option value="local">Local minimal</option>
            </Select>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              <Brain className="mr-1 h-3.5 w-3.5" />
              {activeAgent?.description}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => void exportConversation("markdown")} title="Export Markdown">
              <FileText className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => void exportConversation("pdf")} title="Export PDF">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-4 py-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {messages.length === 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold">Organisez, analysez et automatisez votre savoir.</h2>
                <p className="mt-2 text-muted-foreground">
                  Choisissez un agent, ajoutez un document si besoin, puis lancez une conversation.
                </p>
              </Card>
            )}
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`group rounded-lg border p-4 ${
                    message.role === "user" ? "ml-auto max-w-[85%] bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-wide opacity-75">
                    <span>{message.role === "user" ? "Vous" : activeAgent?.name ?? "Dunia AI"}</span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => void navigator.clipboard.writeText(message.content)} title="Copier">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {message.role === "assistant" && (
                        <Button size="icon" variant="ghost" onClick={() => speak(message.content)} title="Lire">
                          <Volume2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <ReactMarkdown className="markdown">{message.content}</ReactMarkdown>
                </motion.article>
              ))}
            </AnimatePresence>
            {isSending && <p className="text-sm text-muted-foreground">Dunia AI reflechit...</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        <footer className="border-t bg-card p-4">
          <div className="mx-auto max-w-4xl space-y-3">
            <div
              {...getRootProps()}
              className={`rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground ${
                isDragActive ? "border-primary bg-muted" : ""
              }`}
            >
              <input {...getInputProps()} />
              {attachments.length > 0
                ? `${attachments.length} fichier(s) en contexte`
                : "Glissez des fichiers texte ici ou cliquez pour ajouter du contexte."}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Demandez une synthese, un plan, une automatisation ou une reformulation..."
              />
              <div className="flex flex-col gap-2">
                <Button size="icon" variant="secondary" onClick={dictate} title="Dicter">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button size="icon" onClick={() => void sendMessage()} disabled={isSending} title="Envoyer">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
