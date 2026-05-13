import { completeWithAgent } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { withMemoryContext } from "@/memory/rag";
import type { WorkflowRunnerOptions } from "@/orchestration/workflow-types";

export async function runWorkflow(workflowId: string, options: WorkflowRunnerOptions = {}) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { steps: { orderBy: { order: "asc" } } }
  });

  if (!workflow) {
    throw new Error("Workflow introuvable.");
  }

  await prisma.workflow.update({
    where: { id: workflowId },
    data: { status: "running" }
  });

  let previousOutput = workflow.description;

  try {
    for (const step of workflow.steps) {
      const stepInput = buildStepInput({
        workflowTitle: workflow.title,
        stepTitle: step.title,
        baseInput: step.input,
        previousOutput
      });

      await prisma.workflowStep.update({
        where: { id: step.id },
        data: { status: "running", input: stepInput }
      });

      const { messages } = await withMemoryContext({
        query: stepInput,
        messages: [{ role: "user", content: stepInput }],
        limit: 4
      });

      const completion = await completeWithAgent({
        agentId: step.agentId,
        provider: options.provider ?? "local",
        model: options.model,
        messages
      });

      previousOutput = completion.content;

      await prisma.workflowStep.update({
        where: { id: step.id },
        data: { status: "completed", output: completion.content }
      });
    }

    return prisma.workflow.update({
      where: { id: workflowId },
      data: { status: "completed" },
      include: { steps: { orderBy: { order: "asc" } } }
    });
  } catch (error) {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { status: "failed" }
    });
    throw error;
  }
}

function buildStepInput(input: {
  workflowTitle: string;
  stepTitle: string;
  baseInput: string;
  previousOutput: string;
}): string {
  return [
    `Workflow: ${input.workflowTitle}`,
    `Etape: ${input.stepTitle}`,
    "",
    "Contexte utilisateur:",
    input.baseInput,
    "",
    "Sortie de l'etape precedente:",
    input.previousOutput || "Aucune sortie precedente.",
    "",
    "Produis un resultat structure, directement reutilisable par l'etape suivante."
  ].join("\n");
}
