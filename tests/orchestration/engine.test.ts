import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkflow, finalWorkflowOutput } from "@/orchestration/workflow-engine";

const mocks = vi.hoisted(() => ({
  create: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflow: {
      create: mocks.create
    }
  }
}));

describe("workflow engine", () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.create.mockResolvedValue({ id: "wf1", steps: [] });
  });

  it("creates ordered workflow steps", async () => {
    await createWorkflow({
      title: "Resume",
      context: "Document source",
      steps: [
        { agentId: "analyste", title: "Analyser" },
        { agentId: "redacteur", title: "Rediger" }
      ]
    });

    const payload = mocks.create.mock.calls[0][0];
    expect(payload.data.steps.create[0].order).toBe(0);
    expect(payload.data.steps.create[1].input).toBe("Document source");
  });

  it("returns the latest available output", () => {
    expect(
      finalWorkflowOutput({
        steps: [
          { order: 0, output: "analyse" },
          { order: 1, output: "final" }
        ]
      })
    ).toBe("final");
  });
});
