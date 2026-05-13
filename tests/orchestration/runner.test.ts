import { beforeEach, describe, expect, it, vi } from "vitest";
import { runWorkflow } from "@/orchestration/workflow-runner";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  workflowUpdate: vi.fn(),
  stepUpdate: vi.fn(),
  completeWithAgent: vi.fn(),
  withMemoryContext: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflow: {
      findUnique: mocks.findUnique,
      update: mocks.workflowUpdate
    },
    workflowStep: {
      update: mocks.stepUpdate
    }
  }
}));

vi.mock("@/lib/ai", () => ({
  completeWithAgent: mocks.completeWithAgent
}));

vi.mock("@/memory/rag", () => ({
  withMemoryContext: mocks.withMemoryContext
}));

describe("workflow runner", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.workflowUpdate.mockReset();
    mocks.stepUpdate.mockReset();
    mocks.completeWithAgent.mockReset();
    mocks.withMemoryContext.mockReset();

    mocks.findUnique.mockResolvedValue({
      id: "wf1",
      title: "Workflow",
      description: "Contexte initial",
      steps: [
        { id: "s1", agentId: "analyste", order: 0, title: "Analyse", input: "Base" },
        { id: "s2", agentId: "redacteur", order: 1, title: "Redaction", input: "Base" }
      ]
    });
    mocks.withMemoryContext.mockImplementation(async ({ messages }) => ({ messages, memories: [], documents: [] }));
    mocks.completeWithAgent
      .mockResolvedValueOnce({ content: "sortie analyse", provider: "local", model: "dunia-local", offline: true })
      .mockResolvedValueOnce({ content: "sortie finale", provider: "local", model: "dunia-local", offline: true });
    mocks.workflowUpdate.mockImplementation(async ({ data }) => ({ id: "wf1", status: data.status, steps: [] }));
  });

  it("runs steps sequentially and passes previous output forward", async () => {
    await runWorkflow("wf1", { provider: "local" });

    expect(mocks.completeWithAgent).toHaveBeenCalledTimes(2);
    expect(mocks.stepUpdate.mock.calls[2][0].data.input).toContain("sortie analyse");
    expect(mocks.stepUpdate.mock.calls[3][0].data.output).toBe("sortie finale");
  });
});
