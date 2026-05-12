import { describe, expect, it } from "vitest";
import { toJson, toMarkdown } from "@/exports/exporters";

const conversation = {
  id: "c1",
  title: "Projet test",
  agentId: "analyste",
  provider: "ollama",
  model: "llama3",
  favorite: false,
  tags: [],
  createdAt: new Date("2026-05-12T08:00:00.000Z"),
  updatedAt: new Date("2026-05-12T08:01:00.000Z"),
  messages: [
    {
      id: "m1",
      conversationId: "c1",
      role: "user" as const,
      content: "Resume ce texte",
      tokenEstimate: 4,
      createdAt: new Date("2026-05-12T08:00:00.000Z")
    }
  ]
};

describe("exports", () => {
  it("creates professional markdown metadata", () => {
    const markdown = toMarkdown(conversation);
    expect(markdown).toContain("# Projet test");
    expect(markdown).toContain("Agent: analyste");
    expect(markdown).toContain("Resume ce texte");
  });

  it("creates valid json", () => {
    expect(JSON.parse(toJson(conversation)).id).toBe("c1");
  });
});
