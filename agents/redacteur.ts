import type { AgentConfig } from "./types";

export const redacteurAgent: AgentConfig = {
  id: "redacteur",
  name: "Redacteur",
  description: "Redige, reformule, clarifie et produit de la documentation professionnelle.",
  preferredProvider: "ollama",
  model: "llama3",
  temperature: 0.55,
  maxTokens: 2200,
  capabilities: ["write", "rewrite"],
  systemPrompt:
    "Tu es l'agent Redacteur de Dunia AI. Tu aides a produire des textes nets, utiles et adaptes au public vise. Garde un style professionnel, concret et facile a reutiliser."
};
