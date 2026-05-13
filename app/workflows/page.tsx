"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Workflow as WorkflowIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type WorkflowStep = {
  id: string;
  agentId: string;
  order: number;
  title: string;
  input: string;
  output: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Workflow = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
};

type WorkflowTemplate = {
  id: string;
  title: string;
  description: string;
  steps: Array<{ agentId: string; title: string }>;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("document-summary");
  const [context, setContext] = useState("");
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const activeWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === activeWorkflowId) ?? workflows[0],
    [activeWorkflowId, workflows]
  );

  const finalOutput = useMemo(
    () =>
      [...(activeWorkflow?.steps ?? [])]
        .reverse()
        .find((step) => step.output?.trim())?.output ?? "",
    [activeWorkflow]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [workflowResponse, templateResponse] = await Promise.all([
        fetch("/api/workflows"),
        fetch("/api/workflows/templates")
      ]);
      const workflowData = (await workflowResponse.json()) as { workflows?: Workflow[]; error?: string };
      const templateData = (await templateResponse.json()) as { templates?: WorkflowTemplate[]; error?: string };

      if (!workflowResponse.ok || !templateResponse.ok) {
        throw new Error(workflowData.error ?? templateData.error ?? "Chargement impossible.");
      }

      setWorkflows(workflowData.workflows ?? []);
      setTemplates(templateData.templates ?? []);
      setActiveWorkflowId((current) => current ?? workflowData.workflows?.[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur inconnue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createFromTemplate() {
    if (!context.trim()) {
      setError("Le contexte utilisateur est obligatoire.");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate, context })
      });
      const data = (await response.json()) as { workflow?: Workflow; error?: string };

      if (!response.ok || !data.workflow) {
        throw new Error(data.error ?? "Creation impossible.");
      }

      setContext("");
      setWorkflows((items) => [data.workflow as Workflow, ...items]);
      setActiveWorkflowId(data.workflow.id);
      toast({ title: "Workflow cree", description: "Les etapes sont pretes pour execution sequentielle." });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erreur inconnue.");
    } finally {
      setIsCreating(false);
    }
  }

  async function runWorkflow(id: string) {
    setRunningId(id);
    setError(null);
    try {
      const response = await fetch("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id, provider: "local" })
      });
      const data = (await response.json()) as { workflow?: Workflow; error?: string };
      if (!response.ok || !data.workflow) {
        throw new Error(data.error ?? "Execution impossible.");
      }
      setWorkflows((items) => items.map((item) => (item.id === id ? (data.workflow as Workflow) : item)));
      setActiveWorkflowId(id);
      toast({ title: "Workflow termine", description: "Le resultat final est disponible." });
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Erreur inconnue.");
      await loadData();
    } finally {
      setRunningId(null);
    }
  }

  async function deleteWorkflow(id: string) {
    const response = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Suppression impossible.");
      return;
    }
    setWorkflows((items) => items.filter((item) => item.id !== id));
    setActiveWorkflowId((current) => (current === id ? null : current));
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Orchestration multi-agents locale</p>
            <h1 className="text-3xl font-bold">Workflows Dunia AI</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void loadData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour chat
              </Link>
            </Button>
          </div>
        </header>

        {error && (
          <Card className="border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </Card>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <WorkflowIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Creer depuis un template</h2>
              </div>
              <div className="space-y-3">
                <select
                  value={selectedTemplate}
                  onChange={(event) => setSelectedTemplate(event.target.value)}
                  aria-label="Template workflow"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
                <Textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Contexte utilisateur, objectif, document ou consignes..."
                  aria-label="Contexte workflow"
                  className="min-h-36"
                />
                <Button className="w-full" onClick={() => void createFromTemplate()} disabled={isCreating}>
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WorkflowIcon className="mr-2 h-4 w-4" />}
                  Creer le workflow
                </Button>
              </div>
            </Card>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Workflows</h2>
              {isLoading && (
                <Card className="flex items-center gap-3 p-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement des workflows...
                </Card>
              )}
              {!isLoading && workflows.length === 0 && (
                <Card className="p-8 text-center">
                  <WorkflowIcon className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h2 className="mt-3 text-xl font-semibold">Aucun workflow</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Creez un workflow depuis un template pour orchestrer plusieurs agents.
                  </p>
                </Card>
              )}
              {workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  onClick={() => setActiveWorkflowId(workflow.id)}
                  className={`w-full rounded-lg border bg-card p-4 text-left transition ${
                    activeWorkflow?.id === workflow.id ? "border-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{workflow.title}</span>
                    <StatusPill status={workflow.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{workflow.description}</p>
                </button>
              ))}
            </section>
          </div>

          <section className="space-y-4">
            {!activeWorkflow && !isLoading && (
              <Card className="p-8 text-center text-muted-foreground">
                Selectionnez ou creez un workflow pour afficher ses etapes.
              </Card>
            )}

            {activeWorkflow && (
              <>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{activeWorkflow.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{activeWorkflow.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => void runWorkflow(activeWorkflow.id)} disabled={runningId === activeWorkflow.id}>
                        {runningId === activeWorkflow.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Lancer
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void deleteWorkflow(activeWorkflow.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="space-y-3">
                  {activeWorkflow.steps.map((step) => (
                    <Card key={step.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Etape {step.order + 1} / {step.agentId}</p>
                          <h3 className="font-semibold">{step.title}</h3>
                        </div>
                        <StatusPill status={step.status} />
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{step.input}</p>
                      {step.output && (
                        <div className="mt-4 rounded-md bg-muted p-3 text-sm leading-6">
                          {step.output}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {finalOutput && (
                  <Card className="p-4">
                    <h2 className="mb-3 text-lg font-semibold">Resultat final</h2>
                    <div className="whitespace-pre-wrap text-sm leading-6">{finalOutput}</div>
                  </Card>
                )}
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{status}</span>;
}
