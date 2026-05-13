import { prisma } from "@/lib/prisma";
import type { CreateWorkflowInput } from "@/orchestration/workflow-types";

export async function createWorkflow(input: CreateWorkflowInput) {
  if (!input.steps.length) {
    throw new Error("Un workflow doit contenir au moins une etape.");
  }

  return prisma.workflow.create({
    data: {
      title: input.title,
      description: input.description ?? "",
      status: "draft",
      steps: {
        create: input.steps.map((step, index) => ({
          agentId: step.agentId,
          order: index,
          title: step.title,
          input: step.input?.trim() || input.context,
          status: "draft"
        }))
      }
    },
    include: workflowInclude()
  });
}

export async function listWorkflows() {
  return prisma.workflow.findMany({
    orderBy: { updatedAt: "desc" },
    include: workflowInclude()
  });
}

export async function getWorkflow(id: string) {
  return prisma.workflow.findUnique({
    where: { id },
    include: workflowInclude()
  });
}

export async function deleteWorkflow(id: string) {
  await prisma.workflow.delete({ where: { id } });
}

export function finalWorkflowOutput(workflow: { steps: Array<{ output: string | null; order: number }> }): string {
  return [...workflow.steps]
    .sort((left, right) => left.order - right.order)
    .reverse()
    .find((step) => step.output?.trim())?.output ?? "";
}

function workflowInclude() {
  return {
    steps: {
      orderBy: { order: "asc" as const }
    }
  };
}
