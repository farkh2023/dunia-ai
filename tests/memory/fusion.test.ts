import { describe, it, expect, vi, beforeEach } from "vitest";
import { consolidateFact } from "@/memory/fusion";
import * as search from "@/memory/search";
import * as store from "@/memory/store";
import * as ai from "@/lib/ai";

vi.mock("@/memory/search", () => ({
  searchRelevantMemory: vi.fn()
}));

vi.mock("@/memory/store", () => ({
  createMemoryItem: vi.fn(),
  updateMemoryItem: vi.fn()
}));

vi.mock("@/lib/ai", () => ({
  completeWithAgent: vi.fn()
}));

type MockMemorySearchResult = search.MemorySearchResult;

describe("memory fusion", () => {
  const newFact = {
    title: "Preference Pizza",
    content: "L'utilisateur aime la pizza aux anchois.",
    importance: 3,
    tags: ["food"],
    source: "conv1"
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a new item if no similar memory exists", async () => {
    vi.mocked(search.searchRelevantMemory).mockResolvedValue([]);
    vi.mocked(store.createMemoryItem).mockResolvedValue({ id: "new-1", tags: [] } as never);

    await consolidateFact(newFact);

    expect(store.createMemoryItem).toHaveBeenCalledWith(expect.objectContaining({
      content: newFact.content,
      type: "fact"
    }));
  });

  it("ignores an exact duplicate using local fallback", async () => {
    const existing: MockMemorySearchResult = {
      id: "chunk-1",
      memoryItemId: "existing-1",
      title: "Preference Pizza",
      content: "L'utilisateur aime la pizza aux anchois.",
      source: "conv0",
      tags: [],
      importance: 3,
      score: 0.99,
      createdAt: new Date()
    };
    vi.mocked(search.searchRelevantMemory).mockResolvedValue([existing]);

    await consolidateFact(newFact);

    expect(store.createMemoryItem).not.toHaveBeenCalled();
    expect(ai.completeWithAgent).not.toHaveBeenCalled();
  });

  it("merges similar facts using LLM via update", async () => {
    const existing: MockMemorySearchResult = {
      id: "chunk-1",
      memoryItemId: "existing-1",
      title: "Pizza",
      content: "Il aime la pizza.",
      source: "conv0",
      tags: ["pizza"],
      importance: 3,
      score: 0.88,
      createdAt: new Date()
    };
    vi.mocked(search.searchRelevantMemory).mockResolvedValue([existing]);

    vi.mocked(ai.completeWithAgent).mockResolvedValue({
      content: JSON.stringify({
        action: "MERGE",
        content: "L'utilisateur aime toutes les pizzas, particulièrement celles aux anchois.",
        reason: "Fusion de précisions"
      }),
      provider: "openai",
      model: "gpt-4",
      offline: false
    });

    await consolidateFact(newFact);

    expect(store.updateMemoryItem).toHaveBeenCalledWith("existing-1", expect.objectContaining({
      content: "L'utilisateur aime toutes les pizzas, particulièrement celles aux anchois."
    }));
  });

  it("replaces contradictory facts using LLM via update", async () => {
    const existing: MockMemorySearchResult = {
      id: "chunk-1",
      memoryItemId: "existing-1",
      title: "Pizza",
      content: "L'utilisateur déteste les anchois.",
      source: "conv0",
      tags: [],
      importance: 3,
      score: 0.86,
      createdAt: new Date()
    };
    vi.mocked(search.searchRelevantMemory).mockResolvedValue([existing]);

    vi.mocked(ai.completeWithAgent).mockResolvedValue({
      content: JSON.stringify({
        action: "REPLACE",
        reason: "Mise à jour de préférence"
      }),
      provider: "openai",
      model: "gpt-4",
      offline: false
    });

    await consolidateFact(newFact);

    expect(store.updateMemoryItem).toHaveBeenCalledWith("existing-1", expect.objectContaining({
      content: newFact.content
    }));
  });
});
