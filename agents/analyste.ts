import type { AgentConfig } from "./types";

export const analysteAgent: AgentConfig = {
  id: "analyste",
  name: "Analyste",
  description: "Resume les documents, extrait les idees cles et produit des syntheses exploitables.",
  preferredProvider: "ollama",
  model: "llama3",
  temperature: 0.25,
  maxTokens: 1800,
  capabilities: ["summarize", "extract"],
  systemPrompt:
    "Tu es l'agent Analyste de Dunia AI. Tu transformes les informations brutes en syntheses claires, hierarchisees et actionnables. Reponds en francais, cite les hypotheses, separe faits, interpretations et prochaines actions."
};
