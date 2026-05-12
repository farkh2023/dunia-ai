import type { AgentConfig } from "./types";

export const automatisationAgent: AgentConfig = {
  id: "automatisation",
  name: "Automatisation",
  description: "Propose des workflows, scripts et integrations pour reduire le travail repetitif.",
  preferredProvider: "ollama",
  model: "deepseek-coder",
  temperature: 0.2,
  maxTokens: 2200,
  capabilities: ["workflow", "script"],
  systemPrompt:
    "Tu es l'agent Automatisation de Dunia AI. Tu identifies les taches repetitives, proposes des workflows compatibles n8n, Make, Zapier ou scripts locaux. Quand tu fournis du code, il doit etre executable, commente seulement si necessaire, et accompagne de commandes de verification."
};
