import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractAndStoreMemories, localFactExtraction } from "@/memory/extraction";
import * as ai from "@/lib/ai";
import * as fusion from "@/memory/fusion";

vi.mock("@/lib/ai", () => ({
  completeWithAgent: vi.fn()
}));

vi.mock("@/memory/fusion", () => ({
  consolidateFact: vi.fn()
}));

describe("memory extraction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("extracts facts using LLM and stores them via fusion", async () => {
    const mockFacts = [
      { title: "Fact 1", content: "Details 1", importance: 3, tags: ["tag1"] }
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

    expect(count).toBe(1);
    expect(fusion.consolidateFact).toHaveBeenCalledTimes(1);
    expect(fusion.consolidateFact).toHaveBeenCalledWith(expect.objectContaining({
      title: "Fact 1"
    }));
  });

  it("uses local fallback when LLM response is not JSON", async () => {
    vi.mocked(ai.completeWithAgent).mockResolvedValue({
      content: "Je suis un assistant local et je ne peux pas extraire de JSON.",
      provider: "local",
      model: "dunia-local",
      offline: true
    });

    const count = await extractAndStoreMemories({
      conversationId: "conv2",
      userContent: "Je m'appelle Youss et je travaille sur Dunia AI.",
      assistantContent: "C'est noté.",
      agentId: "agent1"
    });

    // Patterns detected: Identity ("Youss") and Project ("Dunia AI")
    expect(count).toBe(2);
    expect(fusion.consolidateFact).toHaveBeenCalledTimes(2);
    expect(fusion.consolidateFact).toHaveBeenNthCalledWith(1, expect.objectContaining({
      title: "Identité",
      content: "Youss"
    }));
    expect(fusion.consolidateFact).toHaveBeenNthCalledWith(2, expect.objectContaining({
      title: "Projet actuel",
      content: "Dunia AI"
    }));
  });

  describe("localFactExtraction patterns", () => {
    it("detects identity", () => {
      const facts = localFactExtraction("Bonjour, je m'appelle Alice.");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Identité", content: "Alice" });
    });

    it("detects project", () => {
      const facts = localFactExtraction("Je travaille sur le module RAG.");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Projet actuel", content: "le module RAG" });
    });

    it("detects preference", () => {
      const facts = localFactExtraction("Je préfère utiliser TypeScript pour ce projet.");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Préférence", content: "utiliser TypeScript pour ce projet" });
    });

    it("detects constraint", () => {
      const facts = localFactExtraction("Je veux éviter les API cloud payantes.");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Contrainte / Évitement", content: "les API cloud payantes" });
    });

    it("detects priority", () => {
      const facts = localFactExtraction("Ma priorité est la sécurité des données.");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Priorité", content: "la sécurité des données" });
    });

    it("detects explicit notes", () => {
      const facts = localFactExtraction("Mémorise que le serveur tourne sur le port 3000.");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Note importante", content: "le serveur tourne sur le port 3000" });
    });

    it("detects important markers", () => {
      const facts = localFactExtraction("C'est important : ne pas oublier de faire le pnpm db:push !");
      expect(facts).toHaveLength(1);
      expect(facts[0]).toMatchObject({ title: "Note importante", content: "ne pas oublier de faire le pnpm db:push" });
    });
  });
});
