import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractAndStoreMemories } from "@/memory/extraction";
import * as ai from "@/lib/ai";
import * as store from "@/memory/store";

vi.mock("@/lib/ai", () => ({
  completeWithAgent: vi.fn()
}));

vi.mock("@/memory/store", () => ({
  createMemoryItem: vi.fn()
}));

describe("memory extraction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("extracts facts and stores them", async () => {
    const mockFacts = [
      { title: "Fact 1", content: "Details 1", importance: 3, tags: ["tag1"] },
      { title: "Fact 2", content: "Details 2", importance: 4, tags: ["tag2"] }
    ];

    vi.mocked(ai.completeWithAgent).mockResolvedValue({
      content: JSON.stringify(mockFacts),
      provider: "openai",
      model: "gpt-4o",
      offline: false
    });

    const count = await extractAndStoreMemories({
      conversationId: "conv1",
      userContent: "I like pizza",
      assistantContent: "I noted that you like pizza",
      agentId: "agent1"
    });

    expect(count).toBe(2);
    expect(store.createMemoryItem).toHaveBeenCalledTimes(2);
    expect(store.createMemoryItem).toHaveBeenCalledWith(expect.objectContaining({
      title: "Fact 1",
      type: "fact"
    }));
  });

  it("handles empty or invalid AI response", async () => {
    vi.mocked(ai.completeWithAgent).mockResolvedValue({
      content: "I can't find any facts.",
      provider: "openai",
      model: "gpt-4o",
      offline: false
    });

    const count = await extractAndStoreMemories({
      conversationId: "conv1",
      userContent: "Hi",
      assistantContent: "Hello",
      agentId: "agent1"
    });

    expect(count).toBe(0);
    expect(store.createMemoryItem).not.toHaveBeenCalled();
  });
});
