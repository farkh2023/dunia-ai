import { describe, expect, it } from "vitest";
import { getWorkflowTemplate, workflowTemplates } from "@/orchestration/workflow-templates";

describe("workflow templates", () => {
  it("exposes three predefined templates", () => {
    expect(workflowTemplates).toHaveLength(3);
    expect(getWorkflowTemplate("document-summary")?.steps.map((step) => step.agentId)).toEqual([
      "analyste",
      "redacteur"
    ]);
    expect(getWorkflowTemplate("project-plan")?.steps.map((step) => step.agentId)).toEqual([
      "architecte",
      "analyste",
      "redacteur"
    ]);
  });
});
