"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Bot, Clock, Database, Files, History, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Status = {
  mode: string;
  ollama: { online: boolean; models: string[] };
  providers: Record<string, boolean>;
  stats: {
    conversationCount: number;
    messageCount: number;
    memoryCount: number;
    automationRuns: number;
    agents: Array<{ agentId: string; _count: number }>;
  };
};

type ConversationSummary = {
  id: string;
  title: string;
  agentId: string;
  updatedAt: string;
};

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    void fetch("/api/status")
      .then((response) => response.json())
      .then((data: Status) => setStatus(data));
    void fetch("/api/conversations")
      .then((response) => response.json())
      .then((data: { conversations: ConversationSummary[] }) => setConversations(data.conversations.slice(0, 5)));
  }, []);

  const agentData = useMemo(
    () => status?.stats.agents.map((item) => ({ name: item.agentId, conversations: item._count })) ?? [],
    [status]
  );
  const usageData = [
    { day: "Lun", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.12)) },
    { day: "Mar", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.18)) },
    { day: "Mer", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.14)) },
    { day: "Jeu", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.2)) },
    { day: "Ven", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.16)) },
    { day: "Sam", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.1)) },
    { day: "Dim", messages: Math.max(1, Math.round((status?.stats.messageCount ?? 0) * 0.1)) }
  ];

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Pilotage local et memoire</p>
            <h1 className="text-3xl font-bold">Dashboard Dunia AI</h1>
          </div>
          <Button asChild variant="secondary">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour chat
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/memory">
              <Database className="mr-2 h-4 w-4" />
              Memoire
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/documents">
              <Files className="mr-2 h-4 w-4" />
              Documents
            </Link>
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <Metric icon={<History />} label="Conversations" value={status?.stats.conversationCount ?? 0} />
          <Metric icon={<Bot />} label="Messages" value={status?.stats.messageCount ?? 0} />
          <Metric icon={<Database />} label="Memoire" value={status?.stats.memoryCount ?? 0} />
          <Metric icon={<Server />} label="Automatisations" value={status?.stats.automationRuns ?? 0} />
          <Metric icon={<Clock />} label="Minutes estimees" value={Math.round((status?.stats.messageCount ?? 0) * 1.5)} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Activite estimee</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="messages" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" fill="url(#messages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Agents utilises</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentData.length ? agentData : [{ name: "analyste", conversations: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="conversations" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <h2 className="text-lg font-semibold">IA locale</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {status?.ollama.online ? "Ollama detecte et pret pour le mode offline." : "Ollama non detecte sur localhost:11434."}
            </p>
            <p className="mt-3 text-sm">Modeles: {status?.ollama.models.join(", ") || "llama3, mistral, deepseek, phi"}</p>
          </Card>
          <Card className="p-4">
            <h2 className="text-lg font-semibold">API cloud</h2>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {Object.entries(status?.providers ?? {}).map(([name, enabled]) => (
                <p key={name}>{name}: {enabled ? "configure" : "non configure"}</p>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="text-lg font-semibold">Derniers projets</h2>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              {conversations.length === 0 && <p>Aucune conversation enregistree.</p>}
              {conversations.map((conversation) => (
                <p key={conversation.id} className="truncate">
                  {conversation.title} / {conversation.agentId}
                </p>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
