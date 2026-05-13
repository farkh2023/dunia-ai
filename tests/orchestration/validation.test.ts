import { describe, expect, it } from "vitest";
import { workflowCreateSchema, workflowRunSchema, workflowTemplateCreateSchema } from "@/lib/validation";

describe("workflow API validation", () => {
  it("accepts workflow creation payloads", () => {
    const payload = workflowCreateSchema.parse({
      title: "Plan projet",
      context: "Construire une roadmap",
      steps: [{ agentId: "analyste", title: "Analyser" }]
    });

    expect(payload.steps[0]?.agentId).toBe("analyste");
  });

  it("defaults workflow runs to local provider", () => {
    const payload = workflowRunSchema.parse({ workflowId: "wf1" });
    expect(payload.provider).toBe("local");
  });

  it("accepts template workflow creation", () => {
    expect(workflowTemplateCreateSchema.parse({ templateId: "document-summary", context: "Resume" }).templateId).toBe(
      "document-summary"
    );
  });
});
