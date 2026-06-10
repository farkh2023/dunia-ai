import { completeWithAgent } from "@/lib/ai";
import { consolidateFact } from "@/memory/fusion";

export type ExtractedFact = {
  title: string;
  content: string;
  importance: number;
  tags: string[];
};

export async function extractAndStoreMemories(input: {
  conversationId: string;
  userContent: string;
  assistantContent: string;
  agentId: string;
}) {
  const prompt = [
    "Tu es un module de gestion de mémoire pour Dunia AI.",
    "Ta tâche est d'extraire des informations importantes, des faits, des préférences utilisateur ou des détails de projet de l'échange suivant.",
    "",
    "Échange:",
    `Utilisateur: ${input.userContent}`,
    `Assistant: ${input.assistantContent}`,
    "",
    "Règles:",
    "1. Extrais uniquement ce qui est durable et utile pour les futures conversations.",
    "2. Ignore les salutations, le small talk ou les informations éphémères.",
    "3. Formate chaque fait comme un objet JSON dans une liste markdown.",
    "4. Chaque objet doit avoir: title (court), content (précis), importance (1-5), tags (liste de strings).",
    "",
    "Réponds uniquement avec le JSON."
  ].join("\n");

  try {
    const completion = await completeWithAgent({
      agentId: "analyste",
      provider: "auto",
      messages: [{ role: "system", content: prompt }, { role: "user", content: "Extrais les faits marquants." }]
    });

    const facts = parseFacts(completion.content);
    
    for (const fact of facts) {
      await consolidateFact({
        ...fact,
        source: `conversation:${input.conversationId}`
      });
    }

    return facts.length;
  } catch (error) {
    console.error("Failed to extract memories:", error);
    return 0;
  }
}

function parseFacts(content: string): ExtractedFact[] {
  try {
    // Attempt to find JSON in the content
    const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ExtractedFact[];
    }
    
    // Fallback: try to parse the whole content if it looks like JSON
    if (content.trim().startsWith("[")) {
      return JSON.parse(content) as ExtractedFact[];
    }
  } catch {
    // Ignore parsing errors
  }
  return [];
}
