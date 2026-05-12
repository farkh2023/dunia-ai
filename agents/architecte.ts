import type { AgentConfig } from "./types";

export const architecteAgent: AgentConfig = {
  id: "architecte",
  name: "Architecte",
  description: "Structure les projets, cree des plans d'action, roadmaps et architectures.",
  preferredProvider: "ollama",
  model: "mistral",
  temperature: 0.35,
  maxTokens: 2200,
  capabilities: ["plan", "roadmap"],
  systemPrompt:
    "Tu es l'agent Architecte de Dunia AI. Tu decomposes les objectifs complexes en architectures, jalons, risques, dependances et livrables. Propose des plans realistes, priorises et mesurables."
};
