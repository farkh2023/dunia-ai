import { searchRelevantMemory, type MemorySearchResult } from "@/memory/search";
import { completeWithAgent } from "@/lib/ai";
import { updateMemoryItem, createMemoryItem } from "@/memory/store";

const SIMILARITY_THRESHOLD_HIGH = 0.85;

export type FusionAction = "IGNORE" | "MERGE" | "REPLACE" | "NEW";

export type FusionDecision = {
  action: FusionAction;
  content?: string;
  reason?: string;
};

/**
 * Gère la consolidation d'un nouveau fait dans la mémoire existante.
 */
export async function consolidateFact(newFact: {
  title: string;
  content: string;
  importance: number;
  tags: string[];
  source: string;
}) {
  const similar = await searchRelevantMemory(`${newFact.title} ${newFact.content}`, { limit: 1 });
  
  if (similar.length === 0) {
    return await createMemoryItem({ ...newFact, type: "fact" });
  }

  const existing = similar[0];
  const decision = await assessFusion(newFact, existing);

  switch (decision.action) {
    case "IGNORE":
      return null;
    
    case "MERGE":
      if (decision.content) {
        // Au lieu d'archiver, on met à jour l'item existant pour éviter les doublons
        return await updateMemoryItem(existing.memoryItemId, {
          title: newFact.title,
          content: decision.content,
          tags: Array.from(new Set([...newFact.tags, ...existing.tags])),
          importance: Math.max(newFact.importance, existing.importance)
        });
      }
      return null;

    case "REPLACE":
      // Mise à jour de l'item existant avec les nouvelles informations
      return await updateMemoryItem(existing.memoryItemId, {
        title: newFact.title,
        content: newFact.content,
        tags: newFact.tags,
        importance: newFact.importance
      });

    case "NEW":
    default:
      return await createMemoryItem({ ...newFact, type: "fact" });
  }
}

/**
 * Évalue s'il faut fusionner, remplacer ou ignorer un fait.
 */
async function assessFusion(
  newFact: { title: string; content: string },
  existing: MemorySearchResult
): Promise<FusionDecision> {
  // Fallback local déterministe
  if (newFact.content.trim().toLowerCase() === existing.content.trim().toLowerCase()) {
    return { action: "IGNORE", reason: "Contenu identique détecté par fallback" };
  }

  if (existing.score >= SIMILARITY_THRESHOLD_HIGH) {
    // Si le score est très élevé, on tente une fusion via LLM
    try {
      const decision = await askLLMForFusion(newFact, existing);
      if (decision) return decision;
    } catch (e) {
      console.warn("LLM Fusion failed, using fallback:", e);
    }
  }

  // Fallback de sécurité
  if (existing.score >= 0.95) {
    return { action: "IGNORE", reason: "Score de similarité extrême (>0.95)" };
  }

  return { action: "NEW", reason: "Similarité insuffisante pour fusion automatique" };
}

async function askLLMForFusion(
  newFact: { title: string; content: string },
  existing: MemorySearchResult
): Promise<FusionDecision | null> {
  const prompt = [
    "Tu es un expert en gestion de base de connaissances.",
    "Compare les deux faits suivants et décide de l'action à prendre.",
    "",
    "Fait Existant:",
    `Titre: ${existing.title}`,
    `Contenu: ${existing.content}`,
    "",
    "Nouveau Fait:",
    `Titre: ${newFact.title}`,
    `Contenu: ${newFact.content}`,
    "",
    "Actions possibles:",
    "- IGNORE: Le nouveau fait n'apporte strictement aucune information nouvelle.",
    "- MERGE: Les deux faits se complètent ou parlent de la même chose avec des détails différents. Produis un contenu fusionné.",
    "- REPLACE: Le nouveau fait contredit ou met à jour l'ancien (ex: changement de préférence).",
    "- NEW: Les faits sont distincts bien que thématiquement proches.",
    "",
    "Réponds au format JSON: { \"action\": \"...\", \"content\": \"... (si MERGE)\", \"reason\": \"...\" }"
  ].join("\n");

  const completion = await completeWithAgent({
    agentId: "analyste",
    provider: "auto",
    messages: [{ role: "system", content: prompt }, { role: "user", content: "Quelle est ta décision ?" }]
  });

  try {
    const jsonMatch = completion.content.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as FusionDecision;
    }
  } catch {
    return null;
  }
  return null;
}
