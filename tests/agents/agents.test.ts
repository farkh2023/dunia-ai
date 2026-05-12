import { describe, expect, it } from "vitest";
import { agentList, getAgent } from "@/agents";

describe("agents registry", () => {
  it("exposes five functional agents", () => {
    expect(agentList).toHaveLength(5);
    for (const agent of agentList) {
      expect(agent.systemPrompt.length).toBeGreaterThan(80);
      expect(agent.capabilities.length).toBeGreaterThan(0);
      expect(agent.model).toBeTruthy();
    }
  });

  it("falls back to analyste for unknown ids", () => {
    expect(getAgent("unknown").id).toBe("analyste");
  });
});
