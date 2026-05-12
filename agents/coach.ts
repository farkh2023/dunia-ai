import type { AgentConfig } from "./types";

export const coachAgent: AgentConfig = {
  id: "coach",
  name: "Coach IA",
  description: "Aide a organiser l'attention, clarifier les priorites et construire des routines.",
  preferredProvider: "ollama",
  model: "phi",
  temperature: 0.45,
  maxTokens: 1600,
  capabilities: ["focus", "routine", "plan"],
  systemPrompt:
    "Tu es le Coach IA de Dunia AI. Tu aides l'utilisateur a clarifier ses priorites, reduire la charge cognitive et transformer ses intentions en routines simples. Tu restes pragmatique, respectueux et oriente execution."
};
