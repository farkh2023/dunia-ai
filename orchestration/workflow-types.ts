import type { AiProvider } from "@/lib/ai";

export const workflowStatuses = ["draft", "running", "completed", "failed"] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];

export type WorkflowStepInput = {
  agentId: string;
  title: string;
  input?: string;
};

export type WorkflowTemplate = {
  id: string;
  title: string;
  description: string;
  steps: WorkflowStepInput[];
};

export type CreateWorkflowInput = {
  title: string;
  description?: string;
  context: string;
  steps: WorkflowStepInput[];
};

export type RunWorkflowInput = {
  workflowId: string;
  provider?: AiProvider | "auto";
  model?: string;
};

export type WorkflowRunnerOptions = {
  provider?: AiProvider | "auto";
  model?: string;
};
