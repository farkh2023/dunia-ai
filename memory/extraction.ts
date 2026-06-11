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

  let facts: ExtractedFact[] = [];

  try {
    const completion = await completeWithAgent({
      agentId: "analyste",
      provider: "auto",
      messages: [{ role: "system", content: prompt }, { role: "user", content: "Extrais les faits marquants." }]
    });

    facts = parseFacts(completion.content);
  } catch (error) {
    console.error("LLM extraction failed, using fallback:", error);
  }

  // Fallback déterministe local si l'IA échoue ou ne renvoie rien
  if (facts.length === 0) {
    console.log(`[Memory] LLM extracted 0 facts, trying local fallback for: "${input.userContent.slice(0, 50)}..."`);
    facts = localFactExtraction(input.userContent);
    console.log(`[Memory] Local fallback extracted ${facts.length} facts`);
  }
  
  for (const fact of facts) {
    console.log(`[Memory] Consolidating fact: ${fact.title} (type: fact)`);
    await consolidateFact({
      ...fact,
      source: `conversation:${input.conversationId}`
    });
  }

  return facts.length;
}

/**
 * Extraction déterministe basée sur des motifs (regex) pour garantir un fonctionnement local
 * même sans LLM performant ou en cas d'erreur de parsing JSON.
 */
export function localFactExtraction(text: string): ExtractedFact[] {
  const results: ExtractedFact[] = [];
  
  // On découpe par segments simples pour éviter qu'une règle ne "mange" tout le texte
  const segments = text.split(/[.!?]|\bet\b/i).map(s => s.trim()).filter(s => s.length > 5);

  const rules: Array<{ pattern: RegExp; title: string; tags: string[]; importance: number }> = [
    {
      pattern: /je m'appelle ([^,]+)/i,
      title: "Identité",
      tags: ["identité", "personnel"],
      importance: 5
    },
    {
      pattern: /je travaille sur ([^,]+)/i,
      title: "Projet actuel",
      tags: ["projet"],
      importance: 4
    },
    {
      pattern: /je préfère ([^,]+)/i,
      title: "Préférence",
      tags: ["préférence"],
      importance: 3
    },
    {
      pattern: /je veux éviter ([^,]+)/i,
      title: "Contrainte / Évitement",
      tags: ["préférence", "contrainte"],
      importance: 3
    },
    {
      pattern: /ma priorité est ([^,]+)/i,
      title: "Priorité",
      tags: ["priorité"],
      importance: 5
    },
    {
      pattern: /mémorise que (.+)/i,
      title: "Note importante",
      tags: ["manuel", "important"],
      importance: 4
    },
    {
      pattern: /c'est important : (.+)/i,
      title: "Note importante",
      tags: ["manuel", "important"],
      importance: 4
    }
  ];

  for (const segment of segments) {
    for (const rule of rules) {
      const match = segment.match(rule.pattern);
      if (match && match[1]) {
        results.push({
          title: rule.title,
          content: match[1].trim(),
          tags: rule.tags,
          importance: rule.importance
        });
        // Si un segment correspond à une règle, on passe au segment suivant
        break;
      }
    }
  }

  return results;
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
